-- Seed bonus_options for world_cup_winner with odds-based points
-- Points reflect WC 2026 pre-tournament betting odds (lower odds = less points)
INSERT INTO public.bonus_options (type, value, display_label, points, sort_order) VALUES
  -- Top favorites (~10p)
  ('world_cup_winner', 'Argentina',        'Argentina',              10,  1),
  ('world_cup_winner', 'Frankrike',        'Frankrike',              12,  2),
  ('world_cup_winner', 'England',          'England',                12,  3),
  ('world_cup_winner', 'Brasilien',        'Brasilien',              12,  4),
  ('world_cup_winner', 'Spanien',          'Spanien',                12,  5),
  -- Strong contenders (~15-20p)
  ('world_cup_winner', 'Portugal',         'Portugal',               15,  6),
  ('world_cup_winner', 'Tyskland',         'Tyskland',               15,  7),
  ('world_cup_winner', 'Nederländerna',    'Nederländerna',          20,  8),
  -- Mid-tier (~25p)
  ('world_cup_winner', 'USA',              'USA',                    25,  9),
  ('world_cup_winner', 'Colombia',         'Colombia',               25, 10),
  ('world_cup_winner', 'Uruguay',          'Uruguay',                25, 11),
  ('world_cup_winner', 'Marocko',          'Marocko',                25, 12),
  ('world_cup_winner', 'Japan',            'Japan',                  30, 13),
  ('world_cup_winner', 'Kroatien',         'Kroatien',               30, 14),
  ('world_cup_winner', 'Belgien',          'Belgien',                30, 15),
  ('world_cup_winner', 'Schweiz',          'Schweiz',                30, 16),
  -- Outsiders (~35-40p)
  ('world_cup_winner', 'Mexico',           'Mexico',                 35, 17),
  ('world_cup_winner', 'Mexiko',           'Mexiko',                 35, 17),
  ('world_cup_winner', 'Turkiet',          'Turkiet',                35, 18),
  ('world_cup_winner', 'Senegal',          'Senegal',                35, 19),
  ('world_cup_winner', 'Ecuador',          'Ecuador',                35, 20),
  ('world_cup_winner', 'Kanada',           'Kanada',                 40, 21),
  ('world_cup_winner', 'Elfenbenskusten',  'Elfenbenskusten',        40, 22),
  ('world_cup_winner', 'Sverige',          'Sverige',                40, 23),
  ('world_cup_winner', 'Norge',            'Norge',                  40, 24),
  ('world_cup_winner', 'Sydkorea',         'Sydkorea',               40, 25),
  ('world_cup_winner', 'Österrike',        'Österrike',              40, 26),
  -- Big outsiders (~50p)
  ('world_cup_winner', 'Australien',       'Australien',             50, 27),
  ('world_cup_winner', 'Ghana',            'Ghana',                  50, 28),
  ('world_cup_winner', 'Iran',             'Iran',                   50, 29),
  ('world_cup_winner', 'Algeriet',         'Algeriet',               50, 30),
  ('world_cup_winner', 'Tjeckien',         'Tjeckien',               50, 31),
  ('world_cup_winner', 'Paraguay',         'Paraguay',               50, 32),
  ('world_cup_winner', 'Skottland',        'Skottland',              50, 33),
  ('world_cup_winner', 'Tunisien',         'Tunisien',               50, 34),
  ('world_cup_winner', 'Kongo DR',         'Kongo DR',               50, 35),
  ('world_cup_winner', 'Saudiarabien',     'Saudiarabien',           50, 36),
  ('world_cup_winner', 'Sydafrika',        'Sydafrika',              50, 37),
  -- Rank outsiders (~75p)
  ('world_cup_winner', 'Bosnien & Hercegovina', 'Bosnien & Hercegovina', 75, 38),
  ('world_cup_winner', 'Panama',           'Panama',                 75, 39),
  ('world_cup_winner', 'Nya Zeeland',      'Nya Zeeland',            75, 40),
  ('world_cup_winner', 'Egypten',          'Egypten',                75, 41),
  ('world_cup_winner', 'Irak',             'Irak',                   75, 42),
  ('world_cup_winner', 'Jordanien',        'Jordanien',              75, 43),
  ('world_cup_winner', 'Uzbekistan',       'Uzbekistan',             75, 44),
  ('world_cup_winner', 'Kap Verde',        'Kap Verde',              75, 45),
  ('world_cup_winner', 'Curaçao',          'Curaçao',                75, 46),
  ('world_cup_winner', 'Haiti',            'Haiti',                  75, 47),
  ('world_cup_winner', 'Katar',            'Katar',                  75, 48)
ON CONFLICT (type, value) DO UPDATE SET points = EXCLUDED.points, sort_order = EXCLUDED.sort_order;
