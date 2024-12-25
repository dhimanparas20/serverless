from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response
from flask_restful import Api, Resource
from dotenv import load_dotenv
from icecream import ic
import os
from scrape import fetch_weather

# Load environment variables from .env
load_dotenv()

# Flask setup
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "super_secret_key")  # For session handling
api = Api(app)

# Environment variables with defaults
PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
FIX_SCRAPER_UNIT = os.getenv("FIX_SCRAPER_UNIT", "true").lower() == "true"
HOST = os.getenv("HOST", "127.0.0.1")
default_config = {
    "WEBSOCK_BROKER_ADDRESS": os.getenv("WEBSOCK_BROKER_ADDRESS", "test.mosquitto.org"),
    "WEBSOCKET_BASEPATH": os.getenv("WEBSOCKET_BASEPATH", "/mqtt"),
    "WEBSOCK_PORT": int(os.getenv("WEBSOCK_PORT", 8081)),
    "QOS": int(os.getenv("QOS", 1)),
    "WEBSOCKET_RECONNECT_TIMEOUT": int(os.getenv("WEBSOCKET_RECONNECT_TIMEOUT", 5000)),
    "USE_CREDS": os.getenv("USE_CREDS", "false").lower() == "true",
    "CLEAN_SESSION": os.getenv("CLEAN_SESSION", "true").lower() == "true",
    "RETAINED": os.getenv("RETAINED", "true").lower() == "true",
    "WEBSOCK_USE_SSL": os.getenv("WEBSOCK_USE_SSL", "true").lower() == "true",
    "MQTT_USER": os.getenv("MQTT_USER", ""),
    "MQTT_PASS": os.getenv("MQTT_PASS", ""),
    "TOKEN": os.getenv("TOKEN", "default_token"),
    "USER_NAME": os.getenv("USER_NAME", "User"),
    "PINS": os.getenv("PINS", "D1,D2,D3,D4").split(","),
    "SWITCH_NAME": os.getenv("SWITCH_NAME", "D1,D2,D3,D4").split(","),
    "WALL_URL": os.getenv("WALL_URL", "/static/img/wall.jpg"),
}

# Helper function for session check
def is_logged_in():
    return 'logged_in' in session

# Resource classes
class Index(Resource):
    # Render Home page, render login page if not logged in
    def get(self):
        # Check if user is logged in
        if not is_logged_in():
            return redirect(url_for('login'))

        # Render the page
        return make_response(
            render_template('index.html', config=default_config)
        )

# Login the User
class Login(Resource):
    def get(self):
        if is_logged_in():
            return redirect(url_for('index'))
        return make_response(render_template('login.html', error=None, WALL_URL=default_config['WALL_URL']))

    def post(self):
        token = request.form.get('token', '')
        if token == os.getenv("TOKEN"):
            session['logged_in'] = True
            return redirect(url_for('index'))
        return make_response(render_template('login.html', error="Invalid token", WALL_URL=default_config['WALL_URL']))

# Logout the User
class Logout(Resource):
    def get(self):
        session.pop('logged_in', None)
        return redirect(url_for('login'))

# Call Weather Scraper Function
class GetWeather(Resource):
    def get(self):
        data = request.args.to_dict()  # Extract all query parameters as a dictionary

        # Validate required parameters
        if not all(key in data for key in ('city', 'state', 'pincode')):
            return jsonify({
                "status": "error",
                "message": "Please provide 'city', 'state', and 'pincode' as query parameters."
            }), 400
        
        city = "Kuthera" if data['city'] == "Unknown City" else data['city']
        state = "Himachal Pradesh" if data['city'] == "Unknown City" else data['state']
        pincode = "177020" if data['city'] == "Unknown City" else data['pincode']
        # Fetch weather data
        weather_data = fetch_weather(city, state, pincode, unit_fix=FIX_SCRAPER_UNIT)
        
        return jsonify({
            "status": "success",
            "weather_data": weather_data,
        })
    
    def post(self):
        data = request.get_json()
  
        # Input validation
        if not data:
            return jsonify({
                "status": "error",
                "message": "Please provide 'city', 'state', and 'pincode' as query parameters."
            }), 400
        
        city = "Kuthera" if data['city'] == "Unknown City" else data['city']
        state = "Himachal Pradesh" if data['city'] == "Unknown City" else data['state']
        pincode = "177020" if data['city'] == "Unknown City" else data['pincode']

        weather_data = fetch_weather(city, state, pincode, unit_fix=FIX_SCRAPER_UNIT)
        return jsonify({
            "status": "success",
            "weather_data": weather_data,
        })

# Add resources to API
api.add_resource(Index, '/')
api.add_resource(Login, '/login/')
api.add_resource(Logout, '/logout/')
api.add_resource(GetWeather, '/get_weather')

if __name__ == '__main__':
    app.run(debug=DEBUG, port=PORT, threaded=True, host=HOST)
