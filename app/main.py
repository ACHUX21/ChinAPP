import os
import sys

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models.database import init_db

app = create_app()

@app.route('/')
def index():
    from app.routes.decks import get_dashboard_data
    return get_dashboard_data()

from flask import render_template

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Manually create an application context
    with app.app_context():
        init_db()
    
    # Run the Flask application
    app.run(debug=True, port=5000, host='0.0.0.0')