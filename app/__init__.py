from flask import Flask
import os

def create_app():
    app = Flask(
        __name__,
        instance_relative_config=True,
        template_folder='../templates',
        static_folder='../static'
    )
    from .routes.decks import decks_bp
    from .routes.cards import cards_bp
    from .models.database import init_db
    from .routes.study import study_bp
    from .routes.ai import ai_bp
    app.register_blueprint(ai_bp)
    app.register_blueprint(decks_bp)
    app.register_blueprint(cards_bp)
    app.register_blueprint(study_bp)

    app.config['DATABASE'] = 'chinese_flashcards.db'
    
    return app