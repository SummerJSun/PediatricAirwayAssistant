from openai import OpenAI
from dotenv import load_dotenv
import os
from pydantic import BaseModel


class ReasonerOutput(BaseModel):
    NeedImage: bool
    ImageID: int
    NeedKnowledge: bool
    KnowledgeID: int

class Reasoner:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI()

        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(BASE_DIR, "CompletionsAPI", "reasoner_text.txt"), "r") as file:
            self.instruction = file.read()

        self.chat_history = [{"role": "system", "content": self.instruction}]
        assert self.instruction is not None


    def get_response(self):

        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=self.chat_history,
            stream=False
        )

        output = response.choices[0].message.content

        format_agent = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": f"Determine whether the provided text decides to output and image or not. \
                       If an image is needed, set NeedImage to True and provide the ImageID. If not, set NeedImage to False and set ImageID to None. \
                       Then determine whether the provided text decides to output knowledge or not. If knowledge is needed, set NeedKnowledge to True and provide the KnowledgeID."},
                      {"role": "user", "content": f"{output}"}],
            response_format=ReasonerOutput,
        )

        format_response = format_agent.choices[0].message.parsed
        format_response = format_response.dict()
        print(format_response)
        return format_response
    
    def reset(self):
        self.chat_history = [{"role": "system", "content": self.instruction}]


def initialize():
    reasoner = Reasoner()
    return reasoner
    
if __name__ == "__main__":
    reasoner = initialize()
    user_message = "who is simon"
    response = reasoner.get_response(user_message)
    print(response)
    reasoner.reset()