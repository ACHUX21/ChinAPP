from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from app.models.database import get_db_connection
from app.utils.helpers import calculate_mastery_rate, calculate_deck_stats
from datetime import date

decks_bp = Blueprint('decks', __name__)

@decks_bp.route('/')
def index():
    """Main dashboard page"""
    conn = get_db_connection()
    
    try:
        # Get user streaks
        streak = conn.execute('SELECT * FROM user_streaks WHERE id = 1').fetchone()
        if not streak:
            conn.execute('''
                INSERT INTO user_streaks (id, current_streak, longest_streak, total_streak_days)
                VALUES (1, 0, 0, 0)
            ''')
            conn.commit()
            streak = conn.execute('SELECT * FROM user_streaks WHERE id = 1').fetchone()
        
        # Get decks
        decks = conn.execute('''
            SELECT d.*, COUNT(c.id) as card_count 
            FROM decks d 
            LEFT JOIN cards c ON d.id = c.deck_id 
            WHERE d.is_archived = FALSE
            GROUP BY d.id
            ORDER BY d.created_at DESC
        ''').fetchall()
        
        # Get today's study stats
        today = date.today().isoformat()
        today_study = conn.execute('''
            SELECT SUM(cards_studied) as studied_today 
            FROM study_sessions 
            WHERE date(session_date) = date(?)
        ''', (today,)).fetchone()
        
        # Calculate total cards and mastery rate
        total_cards = conn.execute('SELECT COUNT(*) as count FROM cards WHERE is_archived = FALSE').fetchone()['count']
        mastered_cards = conn.execute('SELECT COUNT(*) as count FROM card_progress WHERE srs_level >= 3').fetchone()['count']
        mastery_rate = calculate_mastery_rate(mastered_cards, total_cards)
        
        return render_template('index.html',
                             streak=streak,
                             decks=decks,
                             total_decks=len(decks),
                             total_cards=total_cards,
                             today_studied=today_study['studied_today'] or 0,
                             mastery_rate=mastery_rate)
    except Exception as e:
        print(f"Database error: {e}")
        return render_template('index.html',
                             streak={'current_streak': 0, 'longest_streak': 0},
                             decks=[],
                             total_decks=0,
                             total_cards=0,
                             today_studied=0,
                             mastery_rate=0)
    finally:
        conn.close()

@decks_bp.route('/deck/<int:deck_id>')
def deck_detail(deck_id):
    """Deck detail page"""
    conn = get_db_connection()
    
    try:
        deck = conn.execute('SELECT * FROM decks WHERE id = ?', (deck_id,)).fetchone()
        if not deck:
            return redirect(url_for('decks.index'))
        
        cards = conn.execute('''
            SELECT c.*, cp.srs_level, cp.next_review 
            FROM cards c 
            LEFT JOIN card_progress cp ON c.id = cp.card_id 
            WHERE c.deck_id = ? AND c.is_archived = FALSE
            ORDER BY c.created_at DESC
        ''', (deck_id,)).fetchall()
        
        cards = [dict(card) for card in cards]
        stats = calculate_deck_stats(cards)

        return render_template('deck_detail.html',
                             deck=deck,
                             cards=cards,
                             card_count=stats['card_count'],
                             due_count=stats['due_count'],
                             mastery_rate=stats['mastery_rate'])
    except Exception as e:
        print(f"Database error: {e}")
        return redirect(url_for('decks.index'))
    finally:
        conn.close()

@decks_bp.route('/create_deck', methods=['POST'])
def create_deck():
    """Create a new deck"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'success': False, 'error': 'Deck name is required'})
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO decks (name, description, category, level, color)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('description', ''),
            data.get('category', 'Custom'),
            data.get('level'),
            data.get('color', '#8b5cf6')
        ))
        
        deck_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({'success': True, 'deck_id': deck_id})
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'success': False, 'error': 'Database error'})
    finally:
        conn.close()

@decks_bp.route('/api/decks')
def api_decks():
    """API endpoint to get all decks"""
    conn = get_db_connection()
    try:
        decks = conn.execute('''
            SELECT d.*, COUNT(CASE WHEN c.is_archived = FALSE THEN 1 ELSE NULL END) as card_count 
            FROM decks d 
            LEFT JOIN cards c ON d.id = c.deck_id 
            WHERE d.is_archived = FALSE 
            GROUP BY d.id
        ''').fetchall()
        return jsonify([dict(deck) for deck in decks])
    except Exception as e:
        print(f"Database error: {e}")
        return jsonify([])
    finally:
        conn.close()