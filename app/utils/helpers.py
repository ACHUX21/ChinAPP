from datetime import datetime, date

def calculate_mastery_rate(mastered_cards, total_cards):
    """Calculate mastery rate percentage"""
    return round((mastered_cards / total_cards * 100) if total_cards > 0 else 0, 1)

def calculate_deck_stats(cards):
    """Calculate deck statistics"""
    card_count = len(cards)
    due_count = 0
    mastered_count = 0
    
    for card in cards:
        if card['next_review']:
            try:
                review_date = datetime.fromisoformat(card['next_review']).date()
                if review_date <= date.today():
                    due_count += 1
            except ValueError:
                due_count += 1
        
        if card['srs_level'] and card['srs_level'] >= 3:
            mastered_count += 1
    
    mastery_rate = calculate_mastery_rate(mastered_count, card_count)

    
    return {
        'card_count': card_count,
        'due_count': due_count,
        'mastery_rate': mastery_rate
    }