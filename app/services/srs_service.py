from datetime import datetime, date

def rate_card_srs(cursor, progress, rating, card_id):
    """Apply SM-2 Spaced Repetition Algorithm"""
    ease_factor = progress['ease_factor'] or 2.5
    interval = progress['interval_days'] or 0
    repetitions = progress['repetitions'] or 0
    
    if rating <= 2:  # Again or Hard - reset
        repetitions = 0
        interval = 1
    else:  # Good or Easy
        repetitions += 1
        if repetitions == 1:
            interval = 1
        elif repetitions == 2:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        
        # Adjust ease factor
        ease_factor = max(1.3, ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))
    
    # Update card progress
    cursor.execute('''
        UPDATE card_progress 
        SET srs_level = CASE 
            WHEN ? >= 3 THEN srs_level + 1
            ELSE GREATEST(srs_level - 1, 0)
        END,
        ease_factor = ?,
        interval_days = ?,
        repetitions = ?,
        next_review = datetime('now', ? || ' days'),
        last_reviewed = datetime('now'),
        total_reviews = total_reviews + 1,
        correct_reviews = correct_reviews + CASE WHEN ? >= 3 THEN 1 ELSE 0 END,
        streak_current = CASE 
            WHEN ? >= 3 THEN streak_current + 1 
            ELSE 0 
        END,
        streak_best = MAX(streak_best, 
            CASE WHEN ? >= 3 THEN streak_current + 1 ELSE 0 END)
        WHERE card_id = ?
    ''', (
        rating, ease_factor, interval, repetitions, 
        interval, rating, rating, rating, card_id
    ))
    
    return {'interval': interval, 'ease_factor': ease_factor}

def update_user_streak(cursor):
    """Update user streak after study session"""
    today = date.today().isoformat()
    
    # Check if already studied today
    last_study = cursor.execute('SELECT last_study_date FROM user_streaks WHERE id = 1').fetchone()
    
    if last_study and last_study['last_study_date']:
        try:
            last_date = datetime.fromisoformat(last_study['last_study_date']).date()
            if last_date == date.today():
                return  # Already updated today
        except ValueError:
            pass
    
    # Update streak
    cursor.execute('''
        UPDATE user_streaks 
        SET current_streak = CASE 
            WHEN last_study_date IS NULL THEN 1
            WHEN date(last_study_date) = date('now', '-1 day') THEN current_streak + 1
            ELSE 1
        END,
        longest_streak = MAX(longest_streak, 
            CASE 
                WHEN last_study_date IS NULL THEN 1
                WHEN date(last_study_date) = date('now', '-1 day') THEN current_streak + 1
                ELSE 1
            END),
        total_streak_days = total_streak_days + 1,
        last_study_date = date('now')
        WHERE id = 1
    ''')
    
    # Log daily study
    cursor.execute('''
        INSERT OR REPLACE INTO daily_study_logs 
        (study_date, cards_studied, minutes_studied, streak_maintained, daily_goal_met)
        VALUES (date('now'), COALESCE((SELECT cards_studied + 1 FROM daily_study_logs WHERE study_date = date('now')), 1),
                1, TRUE, TRUE)
    ''')