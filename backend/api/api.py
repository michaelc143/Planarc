"""  API for the application """
import os
from dotenv import load_dotenv
from routes import api
from flask_cors import CORS
from flask import Flask, jsonify
from models import db

load_dotenv()
app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
db.init_app(app)

app.register_blueprint(api, url_prefix='/api')

@app.errorhandler(404)
def page_not_found(error):
    """ Handle 404 errors """
    return jsonify({
        'message': (
            error.description or
            'The requested URL was not found on the server. '
            'If you entered the URL manually please check your spelling and try again.'
        )
    }), 404

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
