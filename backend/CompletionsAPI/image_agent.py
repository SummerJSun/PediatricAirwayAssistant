from openai import OpenAI
from dotenv import load_dotenv
import json
import os
import time
#add/modify new functions of openAI


class ImageAssistant:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI()

        # load instruction text
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(BASE_DIR, "CompletionsAPI", "img_instruction.txt"), "r") as file:
            self.instruction = file.read()
        assert self.instruction is not None

        self.chat_history = [{"role": "system", "content": self.instruction}]
        self.chat_history_without_system_message = []

    def submit_message(self, bot_message):
        message = {"role": "user", "content": bot_message}
        self.chat_history.append(message)

    def generate_response(self):
        return self.client.chat.completions.create(
            model="gpt-4o",
            messages=self.chat_history,
            stream=False
        )

    def process_resposne(self, bot_message, print_output=False):

        self.submit_message(bot_message)
        response = self.generate_response()
        output = response.choices[0].message.content
        #only keep the instruction
        self.chat_history = self.chat_history[:1]
        if print_output:
            print(output)
            print(len(self.chat_history))
        return output


def initialize():
    assistant = ImageAssistant()
    return assistant
    
