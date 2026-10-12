"""Translate the checked-in TheMealDB snapshot to Brazilian Portuguese.

Requires argostranslate and its English -> Portuguese (Brazil) package (en -> pb).
The cache makes long runs resumable and keeps repeated ingredients consistent.
"""

import json
import re
import sys
import time
from fractions import Fraction
from pathlib import Path

import argostranslate.package
import argostranslate.translate


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts/data/themealdb-en.json"
OUTPUT = ROOT / "src/data/worldRecipes.json"
CACHE = ROOT / ".translation-cache.json"

# O modelo preserva alguns nomes ingleses de ingredientes. Revisões culinárias
# pontuais evitam que eles apareçam na ficha ou mudem o sentido da receita.
GLOSSARY = {
    "Achiote Oil (Aceite Achiotado) Recipe": "Óleo de urucum (aceite achiotado)",
    "Aussie Burgers": "Hambúrgueres australianos",
    "BBQ Pork Sloppy Joes": "Sanduíches de porco com molho barbecue",
    "BeaverTails": "Rabo de castor (doce canadense)",
    "Beef Caldereta": "Caldereta de carne bovina",
    "Beef Mechado": "Mechado de carne bovina",
    "Beef pho": "Pho de carne bovina",
    "Beef Rendang": "Rendang de carne bovina",
    "Bigos (Hunters Stew)": "Bigos (ensopado de caçador)",
    "Bangladeshi fish curry with daikon": "Curry de peixe de Bangladesh com nabo daikon",
    "Callaloo Jamaican Style": "Callaloo à moda jamaicana",
    "CAFE LA LLAVE ESPRESSO ICE CREAM": "Sorvete de café expresso",
    "Chelsea Buns": "Pãezinhos Chelsea",
    "Chicken Handi": "Frango handi",
    "Choc Chip Pecan Pie": "Torta de nozes-pecã com gotas de chocolate",
    "Chocolate Caramel Crispy": "Crocante de chocolate e caramelo",
    "Chocolate Gateau": "Bolo de chocolate",
    "Chocolate Souffle": "Suflê de chocolate",
    "Crock Pot Chicken Baked Tacos": "Tacos assados de frango na panela lenta",
    "Eccles Cakes": "Bolinhos Eccles",
    "Escovitch Fish": "Peixe escovitch",
    "Fennel Dauphinoise": "Funcho gratinado à moda dauphinoise",
    "Griddled aubergines with sesame dressing": "Berinjelas grelhadas com molho de gergelim",
    "Grilled aubergines with spicy chickpeas & walnut sauce": "Berinjelas grelhadas com grão-de-bico picante e molho de nozes",
    "General Tsos Chicken": "Frango do general Tso",
    "Ham croquetas": "Croquetes de presunto",
    "Ham hock colcannon": "Colcannon com joelho de porco",
    "Hodge Podge": "Ensopado de legumes hodge podge",
    "Jam Roly-Poly": "Rocambole de geleia",
    "Jamaican Beef Patties": "Pastéis jamaicanos de carne",
    "Kentucky Fried Chicken": "Frango frito ao estilo Kentucky",
    "Keto Banitsa": "Banitsa cetogênica",
    "Krispy Kreme Donut": "Rosquinha Krispy Kreme",
    "Hot Chocolate Fudge": "Fudge de chocolate",
    "Lakror me Kungull Summer Squash Pie": "Torta lakror de abobrinha",
    "Laksa King Prawn Noodles": "Macarrão laksa com camarão grande",
    "Lamb Pilaf (Plov)": "Pilaf de cordeiro (plov)",
    "Lamb Rogan josh": "Rogan josh de cordeiro",
    "Lamb Tzatziki Burgers": "Hambúrgueres de cordeiro com tzatziki",
    "Lancashire hotpot": "Ensopado Lancashire",
    "Lao Som Pak Pickled Cabbage": "Repolho em conserva laosiano som pak",
    "Massaman Beef curry": "Curry massaman de carne bovina",
    "Manjar (Dulce de Leche)": "Manjar de doce de leite",
    "Nutty Chicken Curry": "Curry de frango com castanhas",
    "Pa Amb Tomaquet (Bread with Tomato)": "Pão com tomate (pa amb tomàquet)",
    "Peach & Blueberry Grunt": "Sobremesa de pêssego e mirtilo (grunt)",
    "Pear Tarte Tatin": "Tarte tatin de pera",
    "Phaphatha Flatbreads": "Pães achatados phaphatha",
    "Pilchard puttanesca": "Sardinha à puttanesca",
    "Pizza Express Margherita": "Pizza margherita ao estilo Pizza Express",
    "Polish patties (kotlety)": "Bolinhos de carne poloneses (kotlety)",
    "Recheado Masala Fish": "Peixe recheado com masala",
    "Rocky Road Fudge": "Fudge de chocolate rocky road",
    "Roast aubergine with goat's cheese & toasted flatbread": "Berinjela assada com queijo de cabra e pão achatado tostado",
    "Samlar Kari – Khmer Red Curry": "Samlar kari (curry vermelho cambojano)",
    "Sauerkraut pierogi": "Pierogi de chucrute",
    "Sauerkraut pierogii": "Pierogi de chucrute",
    "Shakshuka Feta Cheese": "Shakshuka com queijo feta",
    "Shendetlie Honey and Nut Cake": "Bolo albanês de mel e nozes (shendetlie)",
    "Sichuan Style Stir-Fried Chinese Long Beans": "Vagem longa refogada à moda de Sichuan",
    "Slagroomtaart": "Bolo holandês de chantili",
    "Tahini Lentils": "Lentilhas com tahine",
    "Tahini Paste": "Pasta de tahine",
    "Vegan banh mi": "Bánh mì vegano",
    "Ancho Chillies": "Pimentas ancho",
    "Aubergine": "Berinjela",
    "All purpose flour": "Farinha de trigo",
    "Basil": "Manjericão",
    "Basil Leaves": "Folhas de manjericão",
    "Basmati Rice": "Arroz basmati",
    "Baguette": "Baguete",
    "Baking Powder": "Fermento químico em pó",
    "Bay Leaves": "Folhas de louro",
    "Bay Leaf": "Folha de louro",
    "Beef Shin": "Músculo bovino",
    "Beef": "Carne bovina",
    "Beef Stock": "Caldo de carne",
    "Black Pepper": "Pimenta-do-reino",
    "Bean Sprouts": "Brotos de feijão",
    "Breadcrumbs": "Farinha de rosca",
    "Brown Sugar": "Açúcar mascavo",
    "Brandy": "Conhaque",
    "Cacao": "Cacau",
    "Cassava": "Mandioca",
    "Caster Sugar": "Açúcar refinado",
    "Cayenne Pepper": "Pimenta caiena",
    "Challots": "Chalotas",
    "Chicken Stock": "Caldo de frango",
    "Chicken": "Frango",
    "Chicken Stock Cube": "Cubo de caldo de frango",
    "Cherry Tomatoes": "Tomates-cereja",
    "Chives": "Cebolinha",
    "Clear Honey": "Mel claro",
    "Cloves": "Cravos-da-índia",
    "Chili Powder": "Pimenta chili em pó",
    "Chilli": "Pimenta",
    "Chilli Flakes": "Flocos de pimenta",
    "Chilli Powder": "Pimenta chili em pó",
    "Chocolate Chips": "Gotas de chocolate",
    "Clams": "Vôngoles",
    "Cranberry": "Oxicoco",
    "Cinnamon Stick": "Pau de canela",
    "Creme Fraiche": "Creme fraîche",
    "Curry Powder": "Curry em pó",
    "Cream Cheese": "Queijo cremoso",
    "Dark Chocolate": "Chocolate amargo",
    "Daikon Radish": "Rabanete daikon",
    "Deli Ham": "Presunto fatiado",
    "Dill": "Endro",
    "Dill Pickles": "Picles de pepino",
    "Dash": "Uma pitada",
    "Dry White Wine": "Vinho branco seco",
    "Dulce de leche": "Doce de leite",
    "Double Cream": "Creme de leite fresco",
    "Dry sherry": "Xerez seco",
    "Egg Plants": "Berinjelas",
    "Egg White": "Clara de ovo",
    "Egg Yolks": "Gemas de ovo",
    "Feta": "Queijo feta",
    "Freekeh": "Trigo verde freekeh",
    "Fromage Frais": "Queijo fresco",
    "Garlic Clove": "Dente de alho",
    "Garlic Cloves": "Dentes de alho",
    "Ghee": "Manteiga ghee",
    "Ginger": "Gengibre",
    "Ginger Cordial": "Xarope de gengibre",
    "Gingerbread Spice": "Especiarias para pão de mel",
    "Glace Cherry": "Cereja cristalizada",
    "Graham Cracker Crumbs": "Farelo de biscoito graham",
    "Garnish": "Para decorar",
    "Garlic Powder": "Alho em pó",
    "Green Pepper": "Pimentão verde",
    "Green Chilli": "Pimenta verde",
    "Green Beans": "Vagem",
    "Granulated Sugar": "Açúcar granulado",
    "Ground Beef": "Carne bovina moída",
    "Ground Cumin": "Cominho em pó",
    "Ground Cinnamon": "Canela em pó",
    "Ground Ginger": "Gengibre em pó",
    "Ground Pork": "Carne suína moída",
    "Grits": "Sêmola de milho",
    "Handful": "Punhado",
    "Bunch": "Um maço",
    "Ham": "Presunto",
    "Harissa Spice": "Tempero harissa",
    "Hazlenuts": "Avelãs",
    "Heavy Cream": "Creme de leite fresco",
    "Honey": "Mel",
    "Hotsauce": "Molho de pimenta",
    "Jasmine Rice": "Arroz jasmim",
    "Icing Sugar": "Açúcar de confeiteiro",
    "Kidney Beans": "Feijão vermelho",
    "Kale": "Couve",
    "Kosher Salt": "Sal kosher",
    "Lamb Mince": "Carne moída de cordeiro",
    "Lamb Loin Chops": "Costeletas de lombo de cordeiro",
    "Lemon Zest": "Raspas de limão",
    "Lemon": "Limão-siciliano",
    "Lemon Juice": "Suco de limão-siciliano",
    "Leek": "Alho-poró",
    "Lime": "Limão-taiti",
    "Lime juice": "Suco de limão-taiti",
    "Marzipan": "Marzipã",
    "Mozzarella": "Muçarela",
    "Minced Beef": "Carne bovina moída",
    "Mint": "Hortelã",
    "Mung Bean Sprouts": "Brotos de feijão mungo",
    "Muscovado Sugar": "Açúcar mascavo",
    "Noodles": "Macarrão",
    "Powdered Sugar": "Açúcar de confeiteiro",
    "Oil": "Óleo",
    "Oreo Cream Biscuits": "Biscoitos Oreo de creme",
    "Oxtail": "Rabo bovino",
    "Paella Rice": "Arroz para paella",
    "Pita Bread": "Pão pita",
    "Plain Flour": "Farinha de trigo",
    "Plum Tomatoes": "Tomates italianos",
    "Pork": "Carne suína",
    "Prawns": "Camarões",
    "Palm Sugar": "Açúcar de palma",
    "Paprika": "Páprica",
    "Passata": "Molho de tomate passata",
    "Pecan Nuts": "Nozes-pecã",
    "Phyllo Dough": "Massa filo",
    "Pinch": "Pitada",
    "Packet": "Pacote",
    "Jar": "Pote",
    "Splash": "Um pouco",
    "Sprig": "Ramo",
    "Sprigs": "Ramos",
    "Prunes": "Ameixas secas",
    "Puff Pastry": "Massa folhada",
    "Radish": "Rabanete",
    "Red Chilli": "Pimenta vermelha",
    "Red Pepper": "Pimentão vermelho",
    "Red Wine Vinegar": "Vinagre de vinho tinto",
    "Red Snapper": "Pargo vermelho",
    "Rice Vinegar": "Vinagre de arroz",
    "Ricotta": "Ricota",
    "Rocket": "Rúcula",
    "Romano Pepper": "Pimentão romano",
    "Rosemary": "Alecrim",
    "Saffron": "Açafrão",
    "Sauerkraut": "Chucrute",
    "Scallions": "Cebolinha",
    "Spinach": "Espinafre",
    "Extra Virgin Olive Oil": "Azeite de oliva extravirgem",
    "Sea Salt": "Sal marinho",
    "Self-raising Flour": "Farinha de trigo com fermento",
    "Sesame Seed Oil": "Óleo de gergelim",
    "Scotch Bonnet": "Pimenta scotch bonnet",
    "Semolina": "Sêmola",
    "Sesame Seed": "Sementes de gergelim",
    "Sesame Seed Burger Buns": "Pães de hambúrguer com gergelim",
    "Sherry": "Vinho xerez",
    "Squash": "Abóbora",
    "Spring Onions": "Cebolinha",
    "Stilton Cheese": "Queijo stilton",
    "Stout": "Cerveja preta tipo stout",
    "Suet": "Sebo bovino",
    "Sumac": "Sumagre",
    "Sushi Rice": "Arroz para sushi",
    "Speculaas Spice Mix": "Mistura de especiarias para speculaas",
    "Tinned Tomatos": "Tomates em lata",
    "To taste": "A gosto",
    "To serve": "Para servir",
    "For frying": "Para fritar",
    "Tomato Ketchup": "Ketchup de tomate",
    "Turmeric": "Cúrcuma",
    "Habanero Pepper": "Pimenta habanero",
    "Jalapeno": "Pimenta jalapeño",
    "Tempura Flour": "Farinha para tempurá",
    "Tofu": "Tofu",
    "Toor dal": "Ervilha toor dal",
    "Yuca": "Mandioca",
    "Vegetable Stock": "Caldo de legumes",
    "White Wine Vinegar": "Vinagre de vinho branco",
    "Yeast": "Fermento biológico",
    "Yellow Pepper": "Pimentão amarelo",
    "Zapallo Squash": "Abóbora zapallo",
    "barramundi": "Peixe barramundi",
    "celeriac": "Aipo-rábano",
    "fenugreek": "Feno-grego",
    "sage": "Sálvia",
    "sultanas": "Uvas-passas claras",
}
GLOSSARY_LOOKUP = {original.casefold(): translated for original, translated in GLOSSARY.items()}
REPLACEMENTS = {
    "cavalos do porco": "pés de porco",
    "filme colado": "filme plástico",
    "filme de fixação": "filme plástico",
    "o chão pistaches": "os pistaches moídos",
    "Caster de açúcar": "açúcar refinado",
    "açúcar de gelo": "açúcar de confeiteiro",
    "açúcar de cereja": "açúcar de confeiteiro",
    "Cravo de Alho": "Dente de alho",
    "cravo de alho": "dente de alho",
    "Farinha de propósito": "Farinha de trigo",
    "farinha de propósito": "farinha de trigo",
    "Cozimento em pó": "Fermento químico em pó",
    "cozimento em pó": "fermento químico em pó",
    "Tahini Colar": "Pasta de tahine",
    "Beringela": "Berinjela",
    "Beringelas": "Berinjelas",
    "lata de bolo": "forma de bolo",
    "Massageie a ricota": "Amasse a ricota",
    "até ficar duro, dobre": "até ficarem firmes, incorpore delicadamente",
    "Sirva pó quente ou frio com açúcar de confeiteiro": "Sirva quente ou frio, polvilhado com açúcar de confeiteiro",
    "Derrame o grão de bico em uma peneira": "Escorra o grão de bico em uma peneira",
    "Dica o ": "Despeje o ",
    "Dica a ": "Despeje a ",
    "Esticar o óleo": "Coe o óleo",
    "frasco com uma tampa apertada": "pote bem fechado",
    "Bata em uma colher de sopa do líquido grão de bico de cada vez": "Acrescente uma colher de sopa do líquido do grão-de-bico de cada vez e bata",
    "raspar em uma tigela": "transfira para uma tigela",
    "bom shake": "boa sacudida",
    "pequeno shake": "pequena sacudida",
    "SIMPLES CASHEW SOUR CREAM": "CREME AZEDO SIMPLES DE CASTANHA-DE-CAJU",
    "harissa mix": "mistura de harissa",
    "mix de batata": "mistura de batata",
    "filme grudento": "filme plástico",
    "Forno de aquecimento": "Preaqueça o forno",
    "forno de aquecimento": "preaqueça o forno",
    "Dica em uma superfície de trabalho": "Despeje sobre uma superfície de trabalho",
    "relaxe por": "leve à geladeira por",
    "Stir fry": "Refogado",
    "stir fry": "refogado",
}
WORD_REPLACEMENTS = {
    "drizzle": "regue", "fry": "frite", "stir": "mexa", "bake": "asse", "pan": "panela",
    "whizz": "bata", "sprigs": "ramos", "sprig": "ramo", "packet": "pacote", "jar": "pote",
    "blanch": "pré-frite", "mix": "misture",
    "tsp": "colher de chá", "tbsp": "colher de sopa", "tblsp": "colher de sopa",
    "the": "o", "and": "e", "with": "com", "until": "até", "into": "em",
    "water": "água", "flour": "farinha", "sugar": "açúcar", "butter": "manteiga",
}
GAS_MARK_CELSIUS = {1: 140, 2: 150, 3: 170, 4: 180, 5: 190, 6: 200, 7: 220, 8: 230, 9: 240}
SIMPLE_UNITS = [
    (r"(?:tsp|teaspoons?)", "colher de chá"),
    (r"(?:tbs|tbsp|tbls|tblsp|tablespoons?)", "colher de sopa"),
    (r"cups?", "xícara"), (r"(?:g|grams?|grms?)", "g"),
    (r"(?:kg|kilograms?)", "kg"), (r"(?:ml|millilit(?:er|re)s?)", "ml"),
    (r"(?:l|lit(?:er|re)s?)", "l"), (r"(?:lbs?|pounds?)", "lb"),
    (r"(?:oz|ounces?)", "oz"), (r"cloves?", "dente"),
    (r"slices?", "fatia"), (r"sprigs?", "ramo"), (r"(?:cans?|tins?)", "lata"),
]
MEASURE_WORDS = {"large": "grande", "medium": "médio", "small": "pequeno", "chopped": "picado",
                 "sliced": "fatiado", "diced": "em cubos", "beaten": "batido"}
MEASURE_NOTES = {**MEASURE_WORDS, "minced": "picado", "ground": "em pó", "crushed": "amassado",
                 "peeled": "descascado", "heaped": "cheia", "level": "rasa", "minced garlic": "alho picado"}
MEASURE_PLURALS = {"colher de chá": "colheres de chá", "colher de sopa": "colheres de sopa",
                   "xícara": "xícaras", "dente": "dentes", "fatia": "fatias", "lata": "latas", "ramo": "ramos",
                   "grande": "grandes", "médio": "médios", "pequeno": "pequenos", "picado": "picados",
                   "fatiado": "fatiados", "batido": "batidos"}


def measure_unit(number: str, unit: str) -> str:
    amount = sum(float(Fraction(part.replace(",", "."))) for part in number.split())
    return MEASURE_PLURALS.get(unit, unit) if amount > 1 else unit


def localize_measure(original: str, translated: str) -> str:
    raw = re.sub(r"(?<=\d)(?=[½¼¾⅓⅔⅛⅜])", " ", original.strip())
    for fraction, ascii_fraction in {"½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8"}.items():
        raw = raw.replace(fraction, ascii_fraction)
    quantity = r"(?:\d+/\d+|\d+(?:[.,]\d+)?(?:\s+\d+/\d+)?)"
    for unit_pattern, portuguese in SIMPLE_UNITS:
        match = re.fullmatch(rf"({quantity})\s*{unit_pattern}(?:\s+(.+?))?\.?", raw, flags=re.I)
        if match:
            note = match[2]
            if not note:
                return f"{match[1]} {measure_unit(match[1], portuguese)}"
            if note.casefold() in MEASURE_NOTES:
                return f"{match[1]} {measure_unit(match[1], portuguese)} {MEASURE_NOTES[note.casefold()]}"
    if re.fullmatch(quantity, raw):
        return raw
    for english, portuguese in MEASURE_WORDS.items():
        match = re.fullmatch(rf"({quantity})\s+{english}", raw, flags=re.I)
        if match:
            return f"{match[1]} {measure_unit(match[1], portuguese)}"
    return translated


def main() -> None:
    languages = argostranslate.translate.get_installed_languages()
    english = next((language for language in languages if language.code == "en"), None)
    brazilian = next((language for language in languages if language.code == "pb"), None)
    if not english or not brazilian or not english.get_translation(brazilian):
        argostranslate.package.update_package_index()
        package = next(package for package in argostranslate.package.get_available_packages()
                       if package.from_code == "en" and package.to_code == "pb")
        argostranslate.package.install_from_path(package.download())

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    cached = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    texts = list(dict.fromkeys(
        text.strip()
        for recipe in data["recipes"]
        for text in [
            recipe["title"],
            *(name for name, _ in recipe["ingredients"]),
            *(measure for _, measure in recipe["ingredients"]),
            *recipe["steps"],
            *recipe["tags"],
        ]
        if text.strip()
    ))
    print(f"{len(texts)} textos únicos; {len(cached)} no cache", flush=True)
    start = time.monotonic()
    for index, original in enumerate(texts, 1):
        if original not in cached:
            translated = argostranslate.translate.translate(original, "en", "pb").strip()
            translated = re.sub(r"\s+", " ", translated)
            cached[original] = translated
            if index % 20 == 0:
                CACHE.write_text(json.dumps(cached, ensure_ascii=False), encoding="utf-8")
        if index % 100 == 0:
            print(f"{index}/{len(texts)} em {time.monotonic() - start:.0f}s", flush=True)
    CACHE.write_text(json.dumps(cached, ensure_ascii=False), encoding="utf-8")

    def t(value: str, short: bool = False) -> str:
        if not value.strip():
            return value
        translated = GLOSSARY_LOOKUP.get(value.casefold(), cached[value.strip()])
        for wrong, corrected in REPLACEMENTS.items():
            translated = translated.replace(wrong, corrected)
        for english, portuguese in WORD_REPLACEMENTS.items():
            translated = re.sub(rf"\b{english}\b", lambda match: portuguese.capitalize() if match.group()[0].isupper() else portuguese,
                                translated, flags=re.I)
        if short and not value.rstrip().endswith("."):
            translated = translated.rstrip(".")
        if not short:
            translated = re.sub(r"\b(\d{2,3})oC\b", r"\1 °C", translated, flags=re.I)
            translated = re.sub(r"\b(\d{2,3})\s*°?\s*F(?:ahrenheit)?\b",
                                lambda match: f"{round(((int(match[1]) - 32) * 5 / 9) / 5) * 5} °C", translated, flags=re.I)
            translated = re.sub(r"\b(\d{2,3})\s*°?\s*C\b", r"\1 °C", translated, flags=re.I)
            translated = re.sub(r"\b(\d+)\s*cm\b", r"\1 cm", translated, flags=re.I)
            translated = re.sub(r"\bgás\s*(?:marca\s*)?([1-9])\b",
                                lambda match: f"{GAS_MARK_CELSIUS[int(match[1])]} °C (forno a gás, marca {match[1]})",
                                translated, flags=re.I)
        return translated

    for recipe in data["recipes"]:
        recipe["title"] = t(recipe["title"], short=True)
        recipe["ingredients"] = [[t(name, short=True), localize_measure(measure, t(measure, short=True))]
                                 for name, measure in recipe["ingredients"]]
        recipe["steps"] = [text for step in recipe["steps"] if (text := t(step).strip("\u200b\ufeff "))
                           and not re.fullmatch(r"(?:passo|step)\s*\d+", text, flags=re.I)]
        recipe["tags"] = [t(tag, short=True) for tag in recipe["tags"]]
    data["language"] = "pt-BR"
    data["translation"] = "Argos Translate en→pb; tradução automática, revisão editorial pendente"
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Pronto: {OUTPUT} ({time.monotonic() - start:.0f}s)", flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
