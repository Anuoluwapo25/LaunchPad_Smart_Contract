from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from web3 import Web3
import json
import time

w3 = Web3(Web3.HTTPProvider('https://eth-sepolia.g.alchemy.com/v2/uYsrS-5v-ATSnYr6ao0GNDaYNyu8v38E'))

with open('factory_abi.json', 'r') as f:
    factory_abi = json.load(f)

FACTORY_ADDRESS = '0x981A4465A74D467dDd3F28308B255de98F157d72'

factory_contract = w3.eth.contract(address=FACTORY_ADDRESS, abi=factory_abi)

@api_view(['POST'])
def deploy_token(request):
    """
    Deploy a new ERC20 token through the factory contract
    """
    try:
        data = request.data
        token_name = data.get('tokenName')
        token_symbol = data.get('symbol')
        total_supply = int(data.get('totalSupply', 0))
        

        sender_address = data.get('senderAddress')
        private_key = data.get('privateKey')  
        

        if not all([token_name, token_symbol, total_supply > 0, sender_address, private_key]):
            return Response(
                {"error": "Missing required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        

        nonce = w3.eth.get_transaction_count(sender_address)
        
        tx = factory_contract.functions.createToken(
            token_name,
            token_symbol,
            total_supply
        ).build_transaction({
            'from': sender_address,
            'nonce': nonce,
            'gas': 3000000,
            'gasPrice': w3.eth.gas_price,
        })
        
        signed_tx = w3.eth.account.sign_transaction(tx, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
    
        receipt = None
        for i in range(30): 
            try:
                receipt = w3.eth.get_transaction_receipt(tx_hash)
                if receipt:
                    break
            except Exception as e:
                print(f"Waiting for receipt, attempt {i+1}: {str(e)}")
                time.sleep(2) 
        
        if not receipt:
            return Response(
                {
                    "status": "pending",
                    "message": "Transaction submitted but receipt not available yet",
                    "tx_hash": tx_hash.hex()
                }, 
                status=status.HTTP_202_ACCEPTED
            )
        
        token_address = None
        
    
        event_signature = w3.keccak(text="TokenDeployed(address,string,string)").hex()
        
        for log in receipt['logs']:
            if log['address'].lower() == FACTORY_ADDRESS.lower() and log['topics'][0].hex() == event_signature:
                # Extract token address from event data
                if len(log['topics']) > 1:
                    token_address = '0x' + log['topics'][1].hex()[-40:]
                else:
                    token_address = '0x' + log['data'][-40:] 
                break
        
        if not token_address:
            factory_logs = [log for log in receipt['logs'] if log['address'].lower() == FACTORY_ADDRESS.lower()]
            if factory_logs:
    
                last_log = factory_logs[-1]
                if len(last_log['data']) >= 42:
                    token_address = '0x' + last_log['data'][-40:]
        
        if token_address:
            return Response({
                "status": "success",
                "tx_hash": tx_hash.hex(),
                "token_address": token_address,
                "block_number": receipt['blockNumber']
            })
        else:
            return Response({
                "status": "error",
                "message": "Transaction successful but token address not found",
                "tx_hash": tx_hash.hex(),
                "receipt": receipt
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
        

        token_address = None
        

        event_signature = w3.keccak(text="TokenDeployed(address,string,string)").hex()
        

        for log in receipt['logs']:
            if log['address'].lower() == FACTORY_ADDRESS.lower() and log['topics'][0].hex() == event_signature:
                if len(log['topics']) > 1:
                    token_address = '0x' + log['topics'][1].hex()[-40:]
                else:
                    token_address = '0x' + log['data'][-40:]
                break
        
        if not token_address:
            factory_logs = [log for log in receipt['logs'] if log['address'].lower() == FACTORY_ADDRESS.lower()]
            if factory_logs:
                last_log = factory_logs[-1]
                if len(last_log['data']) >= 42:
                    token_address = '0x' + last_log['data'][-40:]
        
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
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
