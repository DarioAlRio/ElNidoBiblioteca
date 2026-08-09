# -*- coding: utf-8 -*-
"""Convierte el Excel de la biblioteca en data/libros.js
   - normaliza campos (mayusculas sueltas, espacios dobles)
   - asigna 3-4 etiquetas tematicas + 1 etiqueta de publico
   - asigna emoji y micro-descripcion
"""
import json, os, re, unicodedata, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, 'books_raw.json')

COLS = {
    'B': 'nombre', 'C': 'apellido', 'D': 'titulo', 'E': 'ilustrador',
    'F': 'coleccion', 'G': 'curso', 'H': 'editorial', 'I': 'cedido',
    'J': 'categoria', 'K': 'premios', 'L': 'anio', 'M': 'edad', 'N': 'seccion',
}

# ---------------------------------------------------------------- utilidades

def sinacento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn').lower()

MINUSCULAS = {'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en',
              'a', 'al', 'con', 'por', 'para', 'un', 'una', 'unos', 'unas',
              'the', 'of', 'and', 'to', 'in', 'da', 'do'}


def titulizar(s):
    """Pasa un texto TODO EN MAYUSCULAS a formato titulo. Deja intacto el resto."""
    limpio = re.sub(r'\s+', ' ', s).strip()
    letras = [c for c in limpio if c.isalpha()]
    if not letras or not all(c.isupper() for c in letras):
        return limpio
    partes = []
    for i, p in enumerate(limpio.split(' ')):
        bajo = p.lower()
        nucleo = re.sub(r'[^a-záéíóúüñ]', '', bajo)
        if i > 0 and nucleo in MINUSCULAS:
            partes.append(bajo)
        elif len(nucleo) <= 1 and nucleo not in ('a', 'y', 'o', 'e'):
            partes.append(p)  # siglas cortas: SM, RBA
        else:
            partes.append(bajo[:1].upper() + bajo[1:])
    return ' '.join(partes)


def limpiar(s):
    return re.sub(r'\s+', ' ', (s or '')).strip(' .,;-')


# ------------------------------------------------------- vocabulario de tags
# tag -> (emoji, [palabras clave sin acentos])
TAGS = [
    ('Álbum ilustrado', '🎨', ['libros para sonar', 'kalandraka', 'combel', 'corimbo',
                               'thule', 'chiqui cuentos', 'beascoa', 'primeras palabras',
                               'mis primeros', 'pop-up', 'toca y']),
    ('Cuentos', '🧚', ['cuento', 'cuentos', 'fabula', 'fabulas', 'caperucita', 'cenicienta',
                       'blancanieves', 'pinocho', 'los tres cerditos', 'bella durmiente',
                       'patito feo', 'gato con botas', 'garbancito', 'pulgarcito',
                       'flautista', 'ali baba', 'aladino', 'ratoncito', 'hansel',
                       'rapunzel', 'sirenita', 'pedro y el lobo', 'mil y una noches',
                       'andersen', 'grimm', 'perrault']),
    ('Cómic', '💥', ['comic', 'tebeo', 'mortadelo', 'zipi', 'asterix', 'tintin', 'manga',
                     'ole', 'superlopez', 'mafalda', 'garfield', 'snoopy', 'anacleto',
                     'carpanta', 'manga', 'viñeta']),
    ('Disney', '🏰', ['disney', 'pocahontas', 'mulan', 'aladdin', 'dumbo', 'bambi',
                      'la dama y el vagabundo', 'el rey leon', 'peter pan', 'toy story',
                      'frozen', 'winnie', 'mickey', 'pixar']),
    ('Aventuras', '🗺️', ['aventura', 'aventuras', 'pirata', 'piratas', 'isla del tesoro',
                          'viaje al centro', 'la vuelta al mundo', 'sandokan', 'salgari',
                          'verne', 'stevenson', 'robinson', 'expedicion', 'naufrag',
                          'selva', 'safari', 'corsario', 'tesoro', 'odisea', 'ilada',
                          'iliada', 'lejanas tierras', 'grandes aventuras', 'karl may',
                          'colmillo blanco', 'jack london', 'moby dick', 'kon-tiki']),
    ('Misterio y terror', '🔦', ['misterio', 'misterios', 'crimen', 'crimenes', 'asesin',
                                 'detective', 'holmes', 'poirot', 'agatha christie',
                                 'terror', 'miedo', 'fantasma', 'fantasmas', 'vampiro',
                                 'dracula', 'zombi', 'pesadilla', 'pesadillas', 'stine',
                                 'stephen king', 'intriga', 'enigma', 'secuestr',
                                 'desapari', 'suspense', 'thriller', 'espia', 'sabueso',
                                 'bram stoker', 'ellroy', 'novela negra', 'poe']),
    ('Fantasía', '🐉', ['fantasia', 'fantastic', 'dragon', 'dragones', 'bruja', 'brujas',
                        'brujo', 'mago', 'magia', 'magic', 'hechiz', 'harry potter',
                        'tolkien', 'anillos', 'hobbit', 'narnia', 'elfo', 'duende',
                        'duendes', 'hada', 'hadas', 'gnomo', 'unicornio', 'kika',
                        'momo', 'ende', 'nunca jamas', 'reino de', 'trolls',
                        'los seis signos de la luz', 'minotauro']),
    ('Ciencia ficción', '🚀', ['ciencia ficcion', 'marciano', 'galax', 'espacial',
                               'robot', 'androide', 'asimov', 'bradbury', 'orwell',
                               '1984', 'distopia', 'ovni', 'extraterrestre', 'clon',
                               'futuro', 'ray bradbury', 'planeta rojo']),
    ('Romántica', '💞', ['amor', 'amores', 'enamorad', 'romantic', 'corazon', 'beso',
                         'pasion', 'boda', 'novia', 'novio', 'danielle steel',
                         'corin tellado', 'sentimientos']),
    ('Histórica', '🏛️', ['historia', 'historica', 'historico', 'guerra', 'medieval',
                          'edad media', 'romano', 'roma', 'egipto', 'faraon', 'inquisicion',
                          'imperio', 'revolucion', 'siglo', 'napoleon', 'templari',
                          'cruzada', 'castillo', 'caballero', 'caballeros', 'vikingo',
                          'segunda guerra', 'holocausto', 'civil espanola', 'franco',
                          'republica', 'catedral']),
    ('Clásicos', '📜', ['clasico', 'clasicos', 'quijote', 'cervantes', 'shakespeare',
                        'dickens', 'tolstoi', 'dostoievski', 'balzac', 'zola', 'hugo',
                        'los miserables', 'jane austen', 'bronte', 'flaubert', 'homero',
                        'virgilio', 'lazarillo', 'la celestina', 'galdos', 'clarin',
                        'la regenta', 'oliver twist', 'mujercitas', 'ana karenina',
                        'madame bovary', 'guerra y paz', 'crimen y castigo', 'austral',
                        'twain', 'kafka', 'stendhal', 'pushkin', 'chejov', 'moliere',
                        'la iliada', 'dorian gray', 'wilde', 'melville']),
    ('Poesía', '🪶', ['poesia', 'poema', 'poemas', 'verso', 'versos', 'rima', 'rimas',
                      'antologia poetica', 'machado', 'lorca', 'becquer', 'neruda',
                      'alberti', 'juan ramon', 'hernandez', 'poeta']),
    ('Teatro', '🎭', ['teatro', 'comedia', 'tragedia', 'drama', 'acto unico', 'escena',
                      'la casa de bernarda', 'don juan tenorio', 'buero vallejo']),
    ('Animales', '🐾', ['animal', 'animales', 'perro', 'perros', 'gato', 'gatos',
                        'caballo', 'leon', 'oso', 'osos', 'lobo', 'lobos', 'raton',
                        'ratones', 'conejo', 'elefante', 'jirafa', 'mono', 'monos',
                        'tigre', 'delfin', 'ballena', 'pajaro', 'pajaros', 'ave', 'aves',
                        'pez', 'peces', 'zorro', 'ardilla', 'cerdit', 'gallina', 'pato',
                        'dinosaurio', 'insecto', 'mascota', 'veterinari', 'granja',
                        'bosque animal', 'zoo']),
    ('Naturaleza', '🌿', ['naturaleza', 'planta', 'plantas', 'arbol', 'arboles', 'flor',
                          'flores', 'jardin', 'jardineria', 'huerto', 'bosque', 'mar',
                          'oceano', 'montana', 'rio', 'setas', 'hongos', 'ecologia',
                          'medio ambiente', 'clima', 'national geographic', 'paisaje',
                          'sabana', 'selva tropical', 'estaciones']),
    ('Ciencia', '🔬', ['ciencia', 'cientific', 'fisica', 'quimica', 'matematic', 'atomo',
                       'universo', 'astronomia', 'planeta', 'estrellas', 'cuerpo humano',
                       'biologia', 'evolucion', 'geologia', 'invento', 'inventos',
                       'tecnologia', 'informatica', 'ordenador', 'internet', 'energia',
                       'experimento', 'anatomia', 'genetica', 'darwin', 'einstein']),
    ('Historia y arte', '🖼️', ['arte', 'pintura', 'pintor', 'museo', 'escultura',
                                'arquitectura', 'goya', 'velazquez', 'picasso', 'dali',
                                'renacimiento', 'barroco', 'impresionis', 'prado',
                                'fotografia', 'diseno', 'grecia', 'griego']),
    ('Música y cine', '🎬', ['musica', 'musical', 'cancion', 'canciones', 'cantante',
                             'guitarra', 'piano', 'opera', 'rock', 'flamenco', 'cine',
                             'pelicula', 'peliculas', 'director de cine', 'hollywood',
                             'actor', 'actriz', 'ballet', 'danza', 'partitura']),
    ('Biografía', '👤', ['biografia', 'biografias', 'autobiografia', 'memorias',
                         'vida de', 'mi vida', 'diario de', 'testimonio', 'confesiones']),
    ('Cocina', '🍲', ['cocina', 'cocinar', 'receta', 'recetas', 'reposteria', 'postre',
                      'postres', 'pan', 'vino', 'queso', 'tapas', 'menu', 'gastronom',
                      'thermomix', 'microondas', 'dieta mediterranea', 'arroz',
                      'buen provecho', 'food', 'chef', 'horno', 'guiso']),
    ('Manualidades y hogar', '🧵', ['manualidad', 'manualidades', 'bricolaje', 'punto de cruz',
                                    'ganchillo', 'costura', 'decoracion', 'decorar',
                                    'labores', 'herramientas', 'carpinteria', 'fontaneria',
                                    'electricidad hogar', 'pintar paredes', 'ceac',
                                    'hagalo usted', 'reformas', 'origami', 'papiroflexia',
                                    'punto', 'restaurar']),
    ('Salud y bienestar', '🌱', ['salud', 'medicina', 'medico', 'enfermedad', 'enfermeria',
                                 'dieta', 'adelgaz', 'nutricion', 'alimentacion',
                                 'embarazo', 'bebe', 'parto', 'yoga', 'relajacion',
                                 'masaje', 'primeros auxilios', 'botiquin', 'remedios',
                                 'ejercicio', 'gimnasia', 'sexual', 'menopausia',
                                 'farmac', 'homeopatia', 'estres']),
    ('Psicología', '🧠', ['psicologia', 'psicolog', 'autoayuda', 'inteligencia emocional',
                          'conocete', 'autoestima', 'meditacion', 'mente', 'emociones',
                          'felicidad', 'motivacion', 'habilidades', 'coaching',
                          'personalidad', 'freud', 'jung']),
    ('Deporte', '⚽', ['deporte', 'futbol', 'gol', 'goles', 'baloncesto', 'ciclismo',
                       'tenis', 'olimp', 'atletismo', 'natacion', 'ajedrez', 'boxeo',
                       'liga', 'mundial de futbol', 'montanismo',
                       'senderismo', 'pesca']),
    ('Viajes', '✈️', ['viaje', 'viajes', 'guia de viaje', 'turismo', 'ruta', 'rutas',
                      'camino de santiago', 'tibet', 'africa', 'asia',
                      'europa', 'atlas', 'mapa', 'mapas', 'ciudades', 'paris', 'londres',
                      'nueva york', 'castilla']),
    ('En inglés', '🇬🇧', ['penguin readers', 'longman', 'oxford', 'cambridge', 'dorling',
                          'kogan page', 'english', 'level ', 'nivel ', 'pearson']),
    ('Idiomas', '🗣️', ['ingles', 'english', 'frances', 'aleman', 'italiano', 'latin',
                        'gramatica', 'diccionario', 'vocabulario', 'conversacion',
                        'espanol para', 'ortografia', 'idioma']),
    ('Consulta', '📚', ['enciclopedia', 'diccionario', 'atlas', 'manual', 'guia',
                        'guia practica', 'anuario', 'almanaque', 'preguntas y respuestas',
                        'todo sobre', 'curso de', 'iniciacion', 'sabelotodo', 'compendio']),
    ('Religión y mitología', '🕊️', ['biblia', 'religion', 'evangelio', 'santo', 'santos',
                                     'virgen', 'jesus', 'dios', 'oracion', 'iglesia',
                                     'mitologia', 'mito', 'mitos', 'leyenda', 'leyendas',
                                     'dioses', 'olimpo', 'budismo', 'islam', 'coran',
                                     'navidad', 'belen']),
    ('Humor', '😄', ['humor', 'chiste', 'chistes', 'risa', 'divertid', 'gracioso',
                     'disparate', 'loco', 'locuras', 'travesura', 'travesuras']),
    ('Escuela y amistad', '🎒', ['escuela', 'colegio', 'cole', 'clase', 'profesor',
                                 'maestro', 'maestra', 'amistad', 'amigo', 'amigos',
                                 'amiga', 'pandilla', 'club', 'instituto', 'campamento',
                                 'bibliotecari', 'deberes', 'recreo', 'diario de niki']),
    ('Sociedad', '🌍', ['sociedad', 'politica', 'economia', 'derecho', 'ley', 'filosofia',
                        'etica', 'periodismo', 'educacion', 'trabajo', 'empresa',
                        'consumidor', 'ocu', 'mujer', 'mujeres', 'derechos', 'paz',
                        'inmigra', 'pobreza', 'ninos del mundo']),
]

EMOJI = {t: e for t, e, _ in TAGS}
EMOJI.update({'Infantil': '🧸', 'Juvenil': '🎒', 'Adultos': '📖', 'Narrativa': '📕'})

# marcas editoriales/colecciones que identifican publico
SELLO_INFANTIL = ['el barco de vapor', 'ala delta', 'el duende verde', 'sopa de libros',
                  'libros para sonar', 'kalandraka', 'combel', 'beascoa', 'corimbo',
                  'chiqui cuentos', 'loqueleo', 'susaeta', 'todo libro', 'gaviota',
                  'bruno', 'edelvives', 'la pandilla de la ardilla', 'proxima parada',
                  'cuentos infantiles', 'aprende divirtiendote', 'camaleon', 'thule',
                  'saldana', 'servilibro', 'planeta junior', 'disney', 'molino']
SELLO_JUVENIL = ['gran angular', 'alta mar', 'bambu', 'periscopio', 'espacio abierto',
                 'alandar', 'tucanes', 'montena', 'salamandra', 'la navaja',
                 'pesadillas', 'stine', 'harry potter', 'elige tu propia aventura',
                 'crepusculo', 'los juegos del hambre']
# series claramente infantiles aunque el Excel no lo indique
SERIE_INFANTIL = ['stilton', 'kika superbruja', 'teo ', 'caillou', 'pocoyo',
                  'los futbolisimos', 'manolito gafotas', 'el pirata garrapata',
                  'clan del pantano', 'mi primer', 'mis primeros', 'barbie',
                  'las tres mellizas', 'blanca nieves', 'winx']


def detectar_publico(txt, cat, sec, edad, curso, col, edi):
    j = ' '.join([cat, sec, edad, curso])
    if re.search(r'\bjuvenil\b', j):
        if 'infantil' in j and 'juvenil' in j:
            return 'Juvenil'
        return 'Juvenil'
    if re.search(r'infantil|1os lectores|1o lectores|1os lect|primeros lectores', j):
        return 'Infantil'
    if 'adulto' in j:
        return 'Adultos'
    m = re.search(r'\b(\d{1,2})\b', edad)
    if m:
        n = int(m.group(1))
        return 'Infantil' if n <= 9 else ('Juvenil' if n <= 13 else 'Adultos')
    if curso:
        if re.search(r'primaria|nivel [12]|level [12]', curso):
            return 'Infantil'
        if re.search(r'eso|bachiller', curso):
            return 'Juvenil'
    blob = txt + ' ' + col + ' ' + edi
    for s in SERIE_INFANTIL:
        if s in blob:
            return 'Infantil'
    for s in SELLO_JUVENIL:
        if s in blob:
            return 'Juvenil'
    for s in SELLO_INFANTIL:
        if s in blob:
            return 'Infantil'
    return ''


_RX = {}


def coincide(clave, texto):
    """Coincidencia por palabra completa (con prefijo libre para claves largas).
       Evita que 'mar' case dentro de 'Maria' o 'oso' dentro de 'hermoso'."""
    rx = _RX.get(clave)
    if rx is None:
        if clave.endswith(' '):
            patron = r'\b' + re.escape(clave.strip()) + r'\b'
        elif len(clave) >= 7:
            patron = r'\b' + re.escape(clave)          # permite plurales/derivados
        else:
            patron = r'\b' + re.escape(clave) + r's?\b'
        rx = _RX[clave] = re.compile(patron)
    return rx.search(texto) is not None


def puntuar_tags(blob):
    puntos = {}
    for tag, _emo, claves in TAGS:
        p = 0
        for k in claves:
            if coincide(k, blob):
                p += 3 if len(k) > 8 else 2
        if p:
            puntos[tag] = p
    return puntos


# micro-descripciones por etiqueta (varias variantes para no repetir)
DESC = {
    'Álbum ilustrado': ['Ilustraciones grandes y pocas palabras, para leer en voz alta.',
                        'Un álbum para mirar tanto como para leer.',
                        'Páginas ilustradas para los que aún no leen solos.',
                        'Poco texto, mucho dibujo: perfecto para empezar.',
                        'De los que se leen sentados en el regazo.'],
    'Cuentos': ['Un cuento de los de toda la vida.',
                'Historias breves para leer antes de dormir.',
                'Cuento clásico, corto y con moraleja.',
                'Se lee en un rato y se recuerda mucho más.',
                'Historia sencilla, ideal para primeros lectores.',
                'Un relato breve para leer juntos.'],
    'Cómic': ['Viñetas, bocadillos y risas aseguradas.',
              'Cómic para leer de una sentada.',
              'Aventura contada en viñetas.'],
    'Disney': ['El clásico de Disney en versión libro.',
               'Una historia Disney para los más pequeños.'],
    'Aventuras': ['Aventura pura: mapas, viajes y algún peligro.',
                  'Para quien quiera perderse lejos de casa.',
                  'Viajes, peligros y finales de infarto.'],
    'Misterio y terror': ['Un misterio que no deja soltar el libro.',
                          'Intriga, pistas y algún escalofrío.',
                          'Para leer con la luz encendida.'],
    'Fantasía': ['Magia, criaturas y mundos imposibles.',
                 'Fantasía para escaparse de lo cotidiano.',
                 'Un mundo mágico esperando al otro lado.'],
    'Ciencia ficción': ['Ciencia ficción para imaginar el futuro.',
                        'Mundos futuros, máquinas y preguntas grandes.'],
    'Romántica': ['Una historia de amor con sus altibajos.',
                  'Sentimientos a flor de piel.'],
    'Histórica': ['Una historia con el pasado de fondo.',
                  'Ficción y memoria de otra época.',
                  'Para viajar en el tiempo sin salir del sillón.'],
    'Clásicos': ['Un clásico que sigue funcionando.',
                 'De esos libros que hay que leer una vez.',
                 'Literatura clásica en edición accesible.'],
    'Poesía': ['Poemas para leer despacio.',
               'Versos breves, ideales para abrir al azar.'],
    'Teatro': ['Texto teatral, pensado para decirse en voz alta.',
               'Una obra de teatro para leer por personajes.'],
    'Animales': ['Con los animales como protagonistas.',
                 'Historias y datos del mundo animal.',
                 'Bichos, pelos y plumas en cada página.',
                 'Para los que se paran a mirar cada animal.'],
    'Naturaleza': ['Naturaleza, campo y aire libre.',
                   'Para mirar el paisaje con otros ojos.'],
    'Ciencia': ['Ciencia explicada de forma sencilla.',
                'Preguntas del mundo, con respuestas claras.'],
    'Historia y arte': ['Arte e historia con muchas imágenes.',
                        'Un paseo por la cultura y sus obras.'],
    'Música y cine': ['Música y pantalla en formato libro.',
                      'Para melómanos y cinéfilos.'],
    'Biografía': ['La vida de alguien, contada de cerca.',
                  'Memorias y recuerdos en primera persona.'],
    'Cocina': ['Recetas para probar este fin de semana.',
               'Cocina de andar por casa, bien explicada.'],
    'Manualidades y hogar': ['Manos a la obra: paso a paso ilustrado.',
                             'Ideas prácticas para hacer en casa.'],
    'Salud y bienestar': ['Consejos de salud y cuidado diario.',
                          'Para cuidarse con criterio.'],
    'Psicología': ['Para entenderse un poco mejor.',
                   'Psicología divulgativa, sin tecnicismos.'],
    'Deporte': ['Deporte, récords y anécdotas.',
                'Para quien vive el deporte de cerca.'],
    'Viajes': ['Un viaje sin salir de la biblioteca.',
               'Rutas, mapas y lugares por descubrir.'],
    'En inglés': ['Lectura graduada en inglés.',
                  'Para practicar inglés leyendo.'],
    'Idiomas': ['Herramienta para aprender idiomas.',
                'Para consultar mientras se estudia.'],
    'Consulta': ['Libro de consulta: se abre por donde haga falta.',
                 'Para buscar datos concretos.'],
    'Religión y mitología': ['Mitos, creencias y relatos fundacionales.',
                             'Historias que se llevan contando siglos.'],
    'Humor': ['Para reírse un rato.',
              'Humor ligero, sin complicaciones.'],
    'Escuela y amistad': ['Amistades, clase y líos cotidianos.',
                          'La vida escolar contada desde dentro.'],
    'Sociedad': ['Una mirada al mundo que nos rodea.',
                 'Temas de actualidad explicados.'],
    'Narrativa': ['Novela para leer sin prisa.',
                  'Narrativa de la buena, sin más etiquetas.',
                  'Una novela que se deja llevar.',
                  'Ficción para las tardes largas.',
                  'Una historia contada de principio a fin.',
                  'Novela de las que enganchan por dentro.'],
}
DESC_PUBLICO = {
    'Infantil': ['Ideal para los más pequeños de la casa.',
                 'Perfecto para primeros lectores.',
                 'Pensado para leer en familia.'],
    'Juvenil': ['Buena entrada para lectores adolescentes.',
                'A medio camino entre lo infantil y lo adulto.'],
}


def elegir(lista, semilla):
    h = int(hashlib.md5(semilla.encode('utf-8')).hexdigest()[:8], 16)
    return lista[h % len(lista)]


# --------------------------------------------------------------- procesado
def main():
    raw = json.load(open(RAW, encoding='utf-8'))[1:]
    libros = []
    for r in raw:
        d = {COLS[k]: limpiar(v) for k, v in r.items() if k in COLS}
        titulo = d.get('titulo', '')
        if not titulo:
            continue
        titulo = titulizar(titulo)
        titulo = re.sub(r'\s*"\s*', ' "', titulo).strip()
        autor = ' '.join(x for x in [titulizar(d.get('nombre', '')),
                                     titulizar(d.get('apellido', ''))] if x).strip()
        editorial = titulizar(d.get('editorial', ''))
        coleccion = d.get('coleccion', '')
        cat = sinacento(d.get('categoria', ''))
        sec = sinacento(d.get('seccion', ''))
        edad = sinacento(d.get('edad', ''))
        curso = sinacento(d.get('curso', ''))

        blob = sinacento(' '.join([titulo, autor, editorial, coleccion,
                                   d.get('categoria', ''), d.get('seccion', '')]))

        # --- publico
        publico = detectar_publico(blob, cat, sec, edad, curso,
                                   sinacento(coleccion), sinacento(editorial))

        # --- tags tematicos
        puntos = puntuar_tags(blob)
        # la categoria/seccion del excel pesa mas
        catsec = cat + ' ' + sec
        for tag, _e, claves in TAGS:
            for k in claves:
                if coincide(k, catsec):
                    puntos[tag] = puntos.get(tag, 0) + 4
        for etq, palabra in [('Cocina', 'recetas'), ('Cómic', 'tebeo'),
                             ('Poesía', 'poemas'), ('Cuentos', 'cuentos'),
                             ('Biografía', 'autobiografia'), ('Clásicos', 'clasico'),
                             ('Manualidades y hogar', 'manualidades'),
                             ('Deporte', 'deporte'), ('Teatro', 'teatro'),
                             ('Consulta', 'guia'), ('Religión y mitología', 'religion'),
                             ('Música y cine', 'cine'), ('Psicología', 'psicologia'),
                             ('Salud y bienestar', 'alimentacion'),
                             ('Ciencia', 'ciencia'), ('Historia y arte', 'historia'),
                             ('Religión y mitología', 'mitologia'),
                             ('Manualidades y hogar', 'decoracion'),
                             ('Narrativa', 'novela'), ('Narrativa', 'relatos')]:
            if coincide(palabra, catsec):
                puntos[etq] = puntos.get(etq, 0) + 5

        if not publico:
            if {'Álbum ilustrado', 'Cuentos', 'Disney'} & set(puntos):
                publico = 'Infantil'
            else:
                publico = 'Adultos'

        orden = sorted(puntos.items(), key=lambda kv: (-kv[1], kv[0]))
        tags = [t for t, _p in orden[:3]]
        if not tags:
            tags = ['Cuentos'] if publico == 'Infantil' else ['Narrativa']
        tags = list(dict.fromkeys(tags))[:3]

        principal = tags[0]
        emoji = EMOJI.get(principal, '📗')
        if publico == 'Infantil' and principal in ('Narrativa', 'Consulta'):
            emoji = '🧸'

        base = list(DESC.get(principal, DESC['Narrativa']))
        # una de cada cuatro fichas infantiles/juveniles menciona el publico
        if publico in DESC_PUBLICO and int(hashlib.md5(titulo.encode('utf-8')).hexdigest()[:2], 16) % 4 == 0:
            base = DESC_PUBLICO[publico]
        desc = elegir(base, titulo + principal)

        libro = {'t': titulo, 'g': [publico] + tags, 'e': emoji, 'd': desc}
        # Nota: NO se publica 'cedido por' (nombres de vecinos = dato personal).
        for clave, campo in [('a', autor), ('il', titulizar(d.get('ilustrador', ''))),
                             ('c', coleccion), ('cu', d.get('curso', '')),
                             ('ed', editorial),
                             ('ca', d.get('categoria', '')), ('p', d.get('premios', '')),
                             ('y', d.get('anio', '')), ('ap', d.get('edad', '')),
                             ('s', d.get('seccion', ''))]:
            if campo:
                libro[clave] = campo
        libros.append(libro)

    libros.sort(key=lambda b: sinacento(b['t']))

    # recuento de etiquetas
    from collections import Counter
    c = Counter(t for b in libros for t in b['g'])
    print('libros:', len(libros))
    for k, v in c.most_common():
        print('  %-25s %d' % (k, v))

    os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
    js = ('/* Catálogo de la Biblioteca El Nido — generado desde el inventario. */\n'
          'window.LIBROS = ' + json.dumps(libros, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(os.path.join(ROOT, 'data', 'libros.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('escrito data/libros.js  (%.0f KB)' % (len(js.encode('utf-8')) / 1024))

    # --- subconjunto ligero para el recomendador de la portada:
    #     variedad de etiquetas, priorizando fichas con autor y editorial.
    #     se toman las fichas mas completas de cada pareja publico+tema.
    completas = sorted(libros, reverse=True,
                       key=lambda x: (len(x.get('a', '')) + len(x.get('ed', '')), x['t']))
    por_clave = {}
    for b in completas:
        clave = (b['g'][0], b['g'][1] if len(b['g']) > 1 else '')
        por_clave.setdefault(clave, []).append(b)
    destacados = []
    for cupo in (1, 2, 3):                     # varias rondas hasta llenar el cupo
        for clave in sorted(por_clave):
            grupo = por_clave[clave]
            if len(grupo) >= cupo and len(destacados) < 48:
                destacados.append(grupo[cupo - 1])
    js2 = ('/* Selección para el recomendador de la portada. */\n'
           'window.DESTACADOS = ' + json.dumps(destacados, ensure_ascii=False,
                                               separators=(',', ':')) + ';\n')
    with open(os.path.join(ROOT, 'data', 'destacados.js'), 'w', encoding='utf-8') as f:
        f.write(js2)
    print('escrito data/destacados.js (%d libros, %.0f KB)'
          % (len(destacados), len(js2.encode('utf-8')) / 1024))


if __name__ == '__main__':
    main()
