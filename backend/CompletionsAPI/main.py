from openai import OpenAI
from dotenv import load_dotenv
from CompletionsAPI.reasoner import *
from CompletionsAPI.db_calls import *
import json
import os
import time
#add/modify new functions of openAI


class BMVAssistant:
    def __init__(self, json_file, instruction_text=None, reinforce=False):
        load_dotenv()
        self.client = OpenAI()

        # load instruction text
        if instruction_text is not None:
            self.instruction = instruction_text
        else:
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            with open(os.path.join(BASE_DIR, "CompletionsAPI", "instruction_text.txt"), "r") as file:
                self.instruction = file.read()

        # # load data file
        # if isinstance(json_file, str):
        #     with open(json_file, 'r') as file:
        #         self.data = json.load(file)
        # else:
        self.data = json_file
        print(json_file)

        # initialization
        self.instruction_and_data = f"Instructions: \n {self.instruction} \n Case Description: \n{self.data}"
        # print(self.instruction_and_data)
        self.chat_history = [{"role": "system", "content": self.instruction_and_data}]
        self.chat_history_without_system_message = []
        self.reinforce = reinforce
        self.reasoner = Reasoner()

    def submit_message(self, user_message):
        message = {"role": "user", "content": user_message}
        self.chat_history.append(message)
        self.chat_history_without_system_message.append(message)

        last_two_messages = self.chat_history[-2:]

        for message in last_two_messages:
            self.reasoner.chat_history.append(message)

        response = self.reasoner.get_response()

        if response["NeedKnowledge"]:
            print('Knowledge Needed')
            knowledge = get_knowledge(response["KnowledgeID"])
            print(knowledge)
            self.submit_knowledge(knowledge)
        if response["NeedImage"]:
            print('Image Needed')
            image_for_frontend, description = get_image(response["ImageID"])
            self.chat_history.append({"role": "system", "content": f"Helpful Image provided. It is about {description}"})
            return image_for_frontend
        
        return None


    def submit_knowledge(self, knowledge):
        knowledge += "Enhance your response to the user using the above provided external knowledge."
        message = {"role": "system", "content": knowledge}
        self.chat_history.append(message)
        self.chat_history_without_system_message.append(message)
        print('Knowledge Appended to History')

    def generate_response(self, streaming):
        return self.client.chat.completions.create(
            model="gpt-4o",
            messages=self.chat_history,
            stream=streaming
        )
    
    def stream_response(self):
        openai_response = self.generate_response(streaming=True)
        full_message = ''
        for chunk in openai_response:
            text = chunk.choices[0].delta.content
            if text != None and len(chunk.choices) > 0:
                full_message += text  # Accumulate chunks of message
                text = text.replace("\n", "\\n")
                yield f"data: {text}\n\n"
        yield "event: stream_close\ndata: Stream completed.\n\n"
        self.chat_history.append({"role": "assistant", "content": full_message})
        print('Bot Response Appended to History')


def initialize(case_description, instruction_text):
    assistant = BMVAssistant(case_description,instruction_text)
    return assistant


def reset(case_description):
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    INSTRUCTION_FILE = os.path.join(BASE_DIR, "CompletionsAPI", "instruction_text.txt")
    print(INSTRUCTION_FILE)
    with open(INSTRUCTION_FILE, "r", encoding='utf-8', errors='replace') as file:
        instruction = file.read()
        print('instruction updated')
    assistant = BMVAssistant(case_description,instruction)
    return assistant
    
