from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from app.models.database import get_db_connection
from app.services.srs_service import rate_card_srs, update_user_streak

study_bp = Blueprint('study', __name__)

@study_bp.route('/deck/<int:deck_id>/study')
def study_deck(deck_id):
    """Study session for a deck"""
    conn = get_db_connection()
    
    try:
        deck = conn.execute('SELECT * FROM decks WHERE id = ?', (deck_id,)).fetchone()
        if not deck:
            return redirect(url_for('decks.index'))
        
        # Get due cards for study
        cards = conn.execute('''
            SELECT c.*, cp.srs_level, cp.next_review
            FROM cards c
            LEFT JOIN card_progress cp ON c.id = cp.card_id
            WHERE c.deck_id = ? AND c.is_archived = FALSE
            AND (cp.next_review IS NULL OR cp.next_review <= datetime('now') OR cp.srs_level < 3)
            ORDER BY cp.srs_level ASC, cp.next_review ASC
            LIMIT 20
        ''', (deck_id,)).fetchall()
        
        # Convert rows to dictionaries for JSON serialization
        cards_dict = []
        for card in cards:
            card_dict = dict(card)
            # Ensure all required fields are present
            for field in ['pinyin', 'example_sentence', 'part_of_speech', 'measure_word', 'notes']:
                card_dict.setdefault(field, '')
            cards_dict.append(card_dict)
        
        return render_template('study.html',
                             deck=dict(deck),
                             cards=cards_dict,
                             card_count=len(cards_dict))
    except Exception as e:
        print(f"Database error: {e}")
        return redirect(url_for('decks.index'))
    finally:
        conn.close()

@study_bp.route('/card/<int:card_id>/rate', methods=['POST'])
def rate_card(card_id):
    """Rate a card after study (SRS algorithm)"""
    data = request.get_json()
    rating = data.get('rating', 3)  # 1-4: Again, Hard, Good, Easy
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Get current progress
        progress = conn.execute('SELECT * FROM card_progress WHERE card_id = ?', (card_id,)).fetchone()
        if not progress:
            return jsonify({'success': False, 'error': 'Card progress not found'})
        
        # Apply SRS algorithm
        result = rate_card_srs(cursor, progress, rating, card_id)
        
        # Update user streak
        update_user_streak(cursor)
        
        conn.commit()
        
        return jsonify({'success': True, 'next_interval': result['interval']})
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'success': False, 'error': 'Database error'})
    finally:
        conn.close()