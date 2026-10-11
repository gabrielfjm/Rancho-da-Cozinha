"""Extrai a tabela oficial TACO do XLSX do NEPA/UNICAMP sem dependências Python.

Baixe de https://nepa.unicamp.br/publicacoes/ e salve como taco.xlsx na raiz.
"""
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def rows(archive, filename, strings):
    root = ET.fromstring(archive.read(filename))
    for row in root.findall('.//x:sheetData/x:row', NS):
        values = {}
        for cell in row.findall('x:c', NS):
            label = re.match(r'[A-Z]+', cell.attrib['r']).group()
            number = 0
            for letter in label:
                number = number * 26 + ord(letter) - 64
            value = cell.find('x:v', NS)
            if value is None:
                inline = cell.find('x:is/x:t', NS)
                text = inline.text if inline is not None else ''
            elif cell.attrib.get('t') == 's':
                text = strings[int(value.text)]
            else:
                text = value.text
            values[number - 1] = text
        yield [values.get(i, '') for i in range(max(values, default=-1) + 1)]


with zipfile.ZipFile('taco.xlsx') as archive:
    root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
    strings = [''.join(t.text or '' for t in item.findall('.//x:t', NS)) for item in root.findall('x:si', NS)]
    data = list(rows(archive, 'xl/worksheets/sheet1.xml', strings))
    categories = {
        'Cereais e derivados': 'Grãos e Farinhas',
        'Verduras, hortaliças e derivados': 'Hortifrúti',
        'Frutas e derivados': 'Hortifrúti',
        'Gorduras e óleos': 'Óleos e Gorduras',
        'Pescados e frutos do mar': 'Carnes',
        'Carnes e derivados': 'Carnes',
        'Leite e derivados': 'Laticínios',
        'Bebidas (alcoólicas e não alcoólicas)': 'Bebidas',
        'Ovos e derivados': 'Laticínios',
        'Produtos açucarados': 'Doces e Confeitaria',
        'Miscelâneas': 'Temperos e Especiarias',
        'Outros alimentos industrializados': 'Outros',
        'Alimentos preparados': 'Outros',
        'Leguminosas e derivados': 'Grãos e Farinhas',
        'Nozes e sementes': 'Grãos e Farinhas',
    }
    aliases = {
        'Mandioca, crua': ['aipim', 'macaxeira'],
        'Açúcar, refinado': ['açúcar branco', 'acucar'],
        'Farinha, de trigo': ['farinha de trigo'],
        'Leite, de vaca, integral': ['leite integral', 'leite'],
    }
    def numeric(value):
        try:
            return round(float(value), 2)
        except (TypeError, ValueError):
            return None

    result = []
    category = 'Outros'
    for row in data[3:]:
        if not row:
            continue
        if row[0] in categories:
            category = categories[row[0]]
            continue
        if not row[0].isdigit() or len(row) < 10 or not row[1]:
            continue
        number, name = row[0], row[1].strip()
        nutrition = {key: numeric(row[index]) for key, index in [('kcal', 3), ('protein', 5), ('fat', 6), ('carbs', 8), ('fiber', 9)]}
        nutrition = {key: value for key, value in nutrition.items() if value is not None}
        is_liquid = category == 'Bebidas' or name.lower().startswith(('leite,', 'óleo,'))
        default = 'ml' if is_liquid else 'g'
        factors = {'ml': 1, 'xícara': 240, 'colher de sopa': 15, 'colher de chá': 5} if is_liquid else {'g': 1, 'kg': 1000}
        units = list(factors)
        if name in ('Farinha, de trigo', 'Açúcar, refinado'):
            factors.update({'xícara': 120 if name.startswith('Farinha') else 200, 'colher de sopa': 8 if name.startswith('Farinha') else 12})
            units = list(factors)
        result.append({'id': 'taco-' + number, 'name': name, 'aliases': aliases.get(name, []), 'category': category,
                       'units': units, 'defaultUnit': default, 'gramsPerUnit': factors,
                       'nutrition': nutrition, 'source': 'TACO'})

    curated = {
        'Hortifrúti': 'maçã verde;maçã gala;maçã fuji;limão siciliano;limão tahiti;abóbora butternut;abóbora japonesa;batata russet;batata doce roxa;cebola roxa;cebola branca;cebolinha;coentro fresco;tomilho fresco;alecrim fresco;sálvia fresca;manjericão fresco;jalapeño;pimenta poblano;pimenta serrano;tomatillo;ruibarbo;aspargo;alcachofra;couve kale;bok choy;broto de feijão;gengibre;capim-limão;funcho;alho-poró;chalota;cranberry;blueberry;framboesa;amora;damasco seco;uva-passa;figo seco',
        'Carnes': 'bacon;linguiça fresca;linguiça calabresa;carne moída bovina;peito bovino brisket;costela bovina;costela suína;ombro suíno;paleta suína;pernil suíno;filé mignon;contrafilé;fraldinha;cupim;peito de frango;coxa de frango;sobrecoxa de frango;asa de frango;peru moído;peito de peru;cordeiro moído;pernil de cordeiro;anchova;atum fresco;salmão;truta;bacalhau;camarão;lula;vieira;tofu firme;tofu macio;tempeh',
        'Laticínios': 'leite;leite integral;leite desnatado;buttermilk;creme de leite fresco;creme azedo;sour cream;iogurte grego;iogurte natural;cream cheese;queijo cheddar;queijo Monterey Jack;queijo pepper jack;queijo parmesão;queijo pecorino;queijo muçarela;queijo provolone;queijo ricota;queijo feta;queijo gorgonzola;queijo gruyère;queijo brie;queijo cottage;manteiga sem sal;manteiga com sal;ovo caipira;clara de ovo;gema de ovo',
        'Grãos e Farinhas': 'farinha de trigo;farinha de trigo integral;farinha de milho;fubá;amido de milho;farinha de arroz;farinha de amêndoas;farinha de aveia;farinha de centeio;farinha de grão-de-bico;semolina;farinha panko;aveia em flocos;arroz arbóreo;arroz basmati;arroz jasmine;quinoa;cuscuz marroquino;bulgur;polenta;macarrão penne;macarrão espaguete;macarrão udon;macarrão soba;macarrão de arroz;feijão vermelho;feijão preto;feijão branco;feijão pinto;lentilha vermelha;lentilha verde;grão-de-bico;milho para pipoca;chia;linhaça;gergelim;tortilha de milho;tortilha de trigo',
        'Temperos e Especiarias': 'sal marinho;sal kosher;flor de sal;pimenta-do-reino;pimenta branca;pimenta caiena;páprica doce;páprica defumada;cominho;coentro em pó;canela em pó;noz-moscada;cravo-da-índia;anis-estrelado;cúrcuma;garam masala;curry em pó;ras el hanout;zaatar;sumac;orégano seco;tomilho seco;alecrim seco;folha de louro;mostarda em pó;alho em pó;cebola em pó;chili em pó;pimenta chipotle;pimenta ancho;molho de soja;molho inglês;molho de peixe;missô branco;extrato de baunilha',
        'Óleos e Gorduras': 'azeite de oliva;óleo de canola;óleo de girassol;óleo de gergelim;óleo de coco;banha de porco;ghee;gordura vegetal',
        'Doces e Confeitaria': 'açúcar;acúcar mascavo;açúcar de confeiteiro;açúcar demerara;mel;melado;xarope de bordo;chocolate amargo;chocolate ao leite;chocolate branco;cacau em pó;gotas de chocolate;leite condensado;doce de leite;marshmallow;fermento químico;fermento biológico seco;bicarbonato de sódio;gelatina sem sabor',
        'Bebidas': 'vinho tinto;vinho branco;cerveja escura;bourbon;rum;suco de maçã;suco de limão;leite de coco;leite de amêndoas;caldo de legumes;caldo de carne;caldo de frango',
        'Enlatados': 'tomate pelado;extrato de tomate;milho em conserva;ervilha em conserva;feijão vermelho cozido;feijão preto cozido;grão-de-bico cozido;leite de coco em lata;pimenta chipotle em adobo',
        'Congelados': 'ervilha congelada;milho congelado;espinafre congelado;frutas vermelhas congeladas',
        'Outros': 'vinagre de maçã;vinagre balsâmico;vinagre de arroz;molho barbecue;mostarda dijon;mostarda amarela;maionese;ketchup;pasta de amendoim;tahine;fermento natural;massa folhada;rapadura',
    }
    existing = {item['name'].casefold() for item in result}
    for cat, names in curated.items():
        for name in names.split(';'):
            if name.casefold() in existing:
                continue
            slug = re.sub(r'[^a-z0-9]+', '-', name.lower().translate(str.maketrans('áàãâéêíóôõúçñ', 'aaaaeeioooucn'))).strip('-')
            is_liquid = cat == 'Bebidas'
            factors = {'ml': 1, 'xícara': 240, 'colher de sopa': 15} if is_liquid else {'g': 1, 'kg': 1000}
            if name in ('ovo caipira',): factors = {'unidade': 50}
            if name == 'farinha de trigo': factors.update({'xícara': 120, 'colher de sopa': 8})
            if name == 'açúcar': factors.update({'xícara': 200, 'colher de sopa': 12})
            result.append({'id': 'curada-' + slug, 'name': name, 'aliases': [], 'category': cat,
                           'units': list(factors), 'defaultUnit': next(iter(factors)), 'gramsPerUnit': factors,
                           'source': 'Curada'})
            existing.add(name.casefold())
    Path('src/data').mkdir(parents=True, exist_ok=True)
    Path('src/data/ingredients.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(result)} ingredientes gerados ({sum(x["source"] == "TACO" for x in result)} TACO)')
