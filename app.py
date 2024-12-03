from flask import Flask, render_template
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Flask setup
app = Flask(__name__)
PORT = int(os.getenv("PORT",5000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Environment variables with defaults
default_config = {
    "WEBSOCK_BROKER_ADDRESS": os.getenv("WEBSOCK_BROKER_ADDRESS", "test.mosquitto.org"),
    "WEBSOCKET_BASEPATH": os.getenv("WEBSOCKET_BASEPATH", ""),
    "WEBSOCK_PORT": int(os.getenv("WEBSOCK_PORT", 8081)),
    "WEBSOCK_USE_SSL": os.getenv("WEBSOCK_USE_SSL", "false").lower() == "true",
    "USER": os.getenv("USER", "default_user"),
    "PASS": os.getenv("PASS", "default_password"),
    "TOKEN": os.getenv("TOKEN", "default_token"),
    "USER_NAME": os.getenv("USER_NAME", "user"),
    "PINS": os.getenv("PINS", "D1,D2,D3,D4").split(","),
    "USE_WSS": os.getenv("USE_WSS", "true").lower() == "true",
    "SWITCH_NAME": os.getenv("SWITCH_NAME", "D1,D2,D3,D4").split(",")
}

# Serve index.html with variables
@app.route('/')
def index():
    # Pass configuration to the template
    return render_template('index.html', config=default_config)

if __name__ == '__main__':
    app.run(debug=DEBUG,port=PORT,threaded=True)
