from flask import Blueprint, request, jsonify
from app.models.database import get_db_connection

cards_bp = Blueprint('cards', __name__)

@cards_bp.route('/deck/<int:deck_id>/add_card', methods=['POST'])
def add_card(deck_id):
    """Add a card to a deck"""
    data = request.get_json()
    
    if not data or not data.get('hanzi') or not data.get('english'):
        return jsonify({'success': False, 'error': 'Hanzi and English are required'})
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Check if deck exists
        deck = conn.execute('SELECT * FROM decks WHERE id = ?', (deck_id,)).fetchone()
        if not deck:
            return jsonify({'success': False, 'error': 'Deck not found'})
        
        cursor.execute('''
            INSERT INTO cards (deck_id, hanzi, pinyin, english, traditional, 
                              measure_word, base64_audio, part_of_speech, example_sentence, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            deck_id,
            data['hanzi'],
            data.get('pinyin', ''),
            data['english'],
            data.get('traditional', ''),
            data.get('measure_word', ''),
            data.get('base64_audio', ''),
            data.get('part_of_speech', ''),
            data.get('example_sentence', ''),
            data.get('notes', '')
        ))
        
        card_id = cursor.lastrowid
        
        # Initialize card progress
        cursor.execute('''
            INSERT OR REPLACE INTO card_progress (card_id, deck_id, srs_level, next_review)
            VALUES (?, ?, 0, datetime('now'))
        ''', (card_id, deck_id))
        
        conn.commit()
        
        return jsonify({'success': True, 'card_id': card_id})
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'success': False, 'error': 'Database error'})
    finally:
        conn.close()

@cards_bp.route('/card/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    """Delete a card (soft delete)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if card exists
        card = conn.execute('SELECT * FROM cards WHERE id = ?', (card_id,)).fetchone()
        if not card:
            return jsonify({'success': False, 'error': 'Card not found'}), 404
        
        # Soft delete the card
        cursor.execute('UPDATE cards SET is_archived = TRUE WHERE id = ?', (card_id,))
        conn.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify({'success': False, 'error': 'Database error'}), 500
    finally:
        conn.close()

@cards_bp.route('/api/deck/<int:deck_id>/cards')
def api_deck_cards(deck_id):
    """API endpoint to get cards for a deck"""
    conn = get_db_connection()
    try:
        cards = conn.execute('''
            SELECT c.*, cp.srs_level, cp.next_review 
            FROM cards c 
            LEFT JOIN card_progress cp ON c.id = cp.card_id 
            WHERE c.deck_id = ? AND c.is_archived = FALSE
        ''', (deck_id,)).fetchall()
        print(cards)
        return jsonify([dict(card) for card in cards])
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify([])
    finally:
        conn.close()