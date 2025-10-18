from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Deck:
    id: int
    name: str
    description: str = ""
    category: str = "Custom"
    level: Optional[str] = None
    color: str = "#8b5cf6"
    is_archived: bool = False
    created_at: Optional[str] = None

@dataclass
class Card:
    id: int
    deck_id: int
    hanzi: str
    english: str
    pinyin: str = ""
    traditional: str = ""
    measure_word: str = ""
    part_of_speech: str = ""
    example_sentence: str = ""
    notes: str = ""
    is_archived: bool = False
    created_at: Optional[str] = None

@dataclass
class CardProgress:
    card_id: int
    deck_id: int
    srs_level: int = 0
    ease_factor: float = 2.5
    interval_days: int = 0
    repetitions: int = 0
    next_review: Optional[str] = None
    last_reviewed: Optional[str] = None