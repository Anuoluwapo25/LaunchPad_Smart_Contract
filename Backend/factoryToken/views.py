from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from web3 import Web3
import json
import time
import os
from django.conf import settings
import logging
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv



logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Get provider URL and other settings from environment variables
PROVIDER_URL = os.environ.get('WEB3_PROVIDER_URL', 'https://eth-sepolia.g.alchemy.com/v2/uYsrS-5v-ATSnYr6ao0GNDaYNyu8v38E')
FACTORY_ADDRESS = os.environ.get('FACTORY_ADDRESS', '0x981A4465A74D467dDd3F28308B255de98F157d72')
SERVER_PRIVATE_KEY = os.environ.get('SERVER_PRIVATE_KEY', '7e176d7fe27760b43efe02ab023d34f1775d64ea632bd3e481bb799411cf6bdb')
SERVER_ADDRESS = os.environ.get('SERVER_ADDRESS', '0xBCB1E2AF36013e8957D4D966df39875e85Ce4b2d')

# Get ABI path from environment variables or use default for Hardhat
# Note: Hardhat typically stores artifacts in the artifacts directory
HARDHAT_ARTIFACT_PATH = os.environ.get(
    'ABI_PATH', 
    '../artifacts/contracts/Token_factoryContract.sol/ERC20Factory.json'
)

# Resolve artifact path (handle both absolute and relative paths)
if not os.path.isabs(HARDHAT_ARTIFACT_PATH):
    HARDHAT_ARTIFACT_PATH = os.path.join(settings.BASE_DIR, HARDHAT_ARTIFACT_PATH)

try:
    # Load the full Hardhat artifact which includes the ABI
    with open(HARDHAT_ARTIFACT_PATH, 'r') as f:
        artifact_json = json.load(f)
        
    # Extract just the ABI from the artifact
    factory_abi = artifact_json.get('abi', [])
    
    if not factory_abi:
        logger.error(f"ABI not found in artifact file: {HARDHAT_ARTIFACT_PATH}")
        
except FileNotFoundError:
    logger.error(f"Artifact file not found at {HARDHAT_ARTIFACT_PATH}")
    factory_abi = []
except json.JSONDecodeError:
    logger.error(f"Invalid JSON in artifact file: {HARDHAT_ARTIFACT_PATH}")
    factory_abi = []

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(PROVIDER_URL))

# Log ABI for debugging
logger.debug(f"Using ABI with {len(factory_abi)} entries")
if not factory_abi:
    logger.error("Empty ABI - contract initialization will fail")

# Initialize contract
factory_contract = w3.eth.contract(address=FACTORY_ADDRESS, abi=factory_abi)

@api_view(['POST'])
@csrf_exempt
def deploy_token(request):
    """
    Deploy a new ERC20 token through the factory contract using server-side signing
    
    Frontend only needs to send token details, backend handles the blockchain interaction
    """
    try:
        data = request.data
        token_name = data.get('tokenName')
        token_symbol = data.get('symbol')
        total_supply = int(data.get('totalSupply', 0))
        user_address = data.get('userAddress')  # The address that will own the tokens
        
        # Validate required token parameters
        if not all([token_name, token_symbol, total_supply > 0, user_address]):
            return Response(
                {"error": "Missing required parameters. Need tokenName, symbol, totalSupply, and userAddress"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify server has private key configured
        if not SERVER_PRIVATE_KEY or not SERVER_ADDRESS:
            logger.error("Server signing keys not configured")
            return Response(
                {"error": "Server not configured for transaction signing"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get the current nonce for the server address
        nonce = w3.eth.get_transaction_count(SERVER_ADDRESS)
        
        # Estimate gas (with buffer)
        try:
            gas_estimate = factory_contract.functions.createToken(
                token_name,
                token_symbol,
                total_supply
            ).estimate_gas({'from': SERVER_ADDRESS})
            gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
        except Exception as e:
            logger.warning(f"Gas estimation failed: {str(e)}. Using default gas limit.")
            gas_limit = 3000000  # Default gas limit
        
        # Build transaction
        tx = factory_contract.functions.createToken(
            token_name,
            token_symbol,
            total_supply
        ).build_transaction({
            'from': SERVER_ADDRESS,
            'nonce': nonce,
            'gas': gas_limit,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id,
        })
        
        # Sign transaction with server's private key
        signed_tx = w3.eth.account.sign_transaction(tx, SERVER_PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Store initial info in response
        response_data = {
            "status": "pending",
            "tx_hash": tx_hash.hex(),
            "message": "Transaction submitted and being processed"
        }
        
        # Try to get receipt (non-blocking for fast response)
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            if receipt:
                token_address = _extract_token_address_from_receipt(receipt)
                if token_address:
                    response_data = {
                        "status": "success",
                        "tx_hash": tx_hash.hex(),
                        "token_address": token_address,
                        "block_number": receipt['blockNumber']
                    }
                else:
                    response_data["message"] = "Transaction submitted but token address not yet available"
        except Exception as e:
            logger.debug(f"Receipt not yet available: {str(e)}")
        
        return Response(response_data)
            
    except Exception as e:
        logger.error(f"Error deploying token: {str(e)}")
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _extract_token_address_from_receipt(receipt):
    """
    Extract the deployed token address from transaction receipt
    using event logs from the factory contract
    """
    try:
        # Try to use event filtering if we have the right ABI
        token_deployed_events = factory_contract.events.TokenDeployed().process_receipt(receipt)
        if token_deployed_events:
            # Get the token address from the event
            return token_deployed_events[0]['args'].get('token', 
                   token_deployed_events[0]['args'].get('tokenAddress'))
    except Exception as e:
        logger.debug(f"Error using events API: {str(e)}")
    
    # Fallback: manually decode logs
    token_address = None
    
    # Get the event signature
    event_signature = w3.keccak(text="TokenDeployed(address,string,string)").hex()
    
    # Look for matching logs
    for log in receipt['logs']:
        if log['address'].lower() == FACTORY_ADDRESS.lower():
            # Check if it's our event by topic
            if len(log['topics']) > 0 and log['topics'][0].hex() == event_signature:
                if len(log['topics']) > 1:
                    token_address = '0x' + log['topics'][1].hex()[-40:]
                elif len(log['data']) >= 42:
                    token_address = '0x' + log['data'][-40:]
                break
    
    # If still not found, try one more approach with any factory logs
    if not token_address:
        factory_logs = [log for log in receipt['logs'] if log['address'].lower() == FACTORY_ADDRESS.lower()]
        if factory_logs:
            last_log = factory_logs[-1]
            if len(log['data']) >= 42:
                token_address = '0x' + last_log['data'][-40:]
    
    return token_address

@api_view(['GET'])
def get_transaction_status(request, tx_hash):
    """
    Get the status of a transaction and find the deployed token address
    """
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        
        if not receipt:
            return Response(
                {"status": "pending", "message": "Transaction not yet mined"},
                status=status.HTTP_202_ACCEPTED
            )
        
        token_address = _extract_token_address_from_receipt(receipt)
        
        if token_address:
            return Response({
                "status": "success",
                "tx_hash": tx_hash,
                "token_address": token_address,
                "block_number": receipt['blockNumber']
            })
        else:
            return Response({
                "status": "error",
                "message": "Transaction successful but token address not found",
                "tx_hash": tx_hash,
                "receipt": receipt
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error checking transaction status: {str(e)}")
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )