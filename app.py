from flask import Flask, render_template, request, redirect, url_for, session,make_response
from flask_restful import Resource, Api
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Flask setup
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "super_secret_key")  # For session handling
api = Api(app)

PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
HOST = os.getenv("HOST", "127.0.0.1")

# Environment variables with defaults
default_config = {
    "WEBSOCK_BROKER_ADDRESS": os.getenv("WEBSOCK_BROKER_ADDRESS", "test.mosquitto.org"),
    "WEBSOCKET_BASEPATH": os.getenv("WEBSOCKET_BASEPATH", ""),
    "WEBSOCK_PORT": int(os.getenv("WEBSOCK_PORT", 8081)),
    "WEBSOCK_USE_SSL": os.getenv("WEBSOCK_USE_SSL", "true").lower() == "true",
    "USER": os.getenv("USER", ""),
    "PASS": os.getenv("PASS", ""),
    "TOKEN": os.getenv("TOKEN", "default_token"),
    "USER_NAME": os.getenv("USER_NAME", "User"),
    "PINS": os.getenv("PINS", "D1,D2,D3,D4").split(","),
    "SWITCH_NAME": os.getenv("SWITCH_NAME", "D1,D2,D3,D4").split(","),
    "WALL_URL": os.getenv("WALL_URL", "img/wall.jpg"),
}

# Resource classes
class Index(Resource):
    def get(self):
        # Check if session exists
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        # Pass configuration to the template
        return make_response(render_template('index.html', config=default_config))

class Login(Resource):
    def get(self):
        # If already logged in, redirect to index
        if 'logged_in' in session:
            return redirect(url_for('index'))
        return make_response(render_template('login.html', error=None))

    def post(self):
        token = request.form.get('token', '')
        if token == os.getenv("TOKEN"):
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            return make_response(render_template('login.html', error="Invalid token"))

class Logout(Resource):
    def get(self):
        session.pop('logged_in', None)
        return redirect(url_for('login'))

# Add resources to API
api.add_resource(Index, '/')
api.add_resource(Login, '/login/')
api.add_resource(Logout, '/logout/')

if __name__ == '__main__':
    app.run(debug=DEBUG, port=PORT, threaded=True, host=HOST)
