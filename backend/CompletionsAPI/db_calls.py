from pymongo import MongoClient
import os
import base64
from flask import jsonify

client = MongoClient("mongodb+srv://simonliu:MclPLjTi3HpYSlrb@cluster0.yrzkofs.mongodb.net/")
db = client[os.environ.get('DB_NAME', 'Chatbot_Data')]

def get_knowledge(id):
    knowledge_collection = db['knowledge']
    try:
        entry = knowledge_collection.find_one({"id": str(id)})
        detail = entry['detail']
        return detail
    except Exception as e:
        return f"Knowledge not found, error is {e}"
    
def get_image(id):
    collection = db['image']
    try:
        # Assuming 'id' is stored as a string; convert to ObjectId if stored as BSON
        # For BSON ObjectId, use: from bson import ObjectId; query = {"_id": ObjectId(id)}
        document = collection.find_one({"id": int(id)})
        if document:
            # Assuming the image is stored in the 'image_data' field as binary
            image_data = document['image']
            # Convert binary to Base64 for easy transmission
            encoded_image = base64.b64encode(image_data).decode('utf-8')
            description = document['description']
            return encoded_image, description
        else:
            return jsonify({"error": "Image not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500