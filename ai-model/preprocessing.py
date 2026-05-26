import re


SOMALI_STOPWORDS = {
    "iyo", "oo", "ee", "ka", "ku", "la", "ay", "uu", "in", "si", "waa",
    "aan", "waxaa", "u", "ah", "waxa", "kale", "sida", "markii", "mar",
    "hadii", "haddii", "laakiin", "bal", "soo", "noqon", "noqday", "lagu",
    "waxay", "waxuu", "waxyaabaha", "cidda", "ama", "se", "xitaa", "hase",
    "yeeshee", "inkastoo", "marka", "kadib", "horeba", "jeer", "kasta",
    "midna", "mid", "baa", "ayaa", "ayuu", "ayay", "ayaan", "sidaas",
    "taas", "tan", "tani", "taasi", "kaas", "kan", "kani", "kaasi",
    "waxba", "marna", "weligeed", "weligii", "iyada", "isaga", "innaga",
    "idinka", "adiga", "aniga", "iyaga", "uma", "kuma", "lama", "ayna",
    "hadda", "kasoo", "hadana", "wuxuu", "qof", "dadka", "taan", "kaddib",
    "jirta", "kuwaas", "dhan", "waana", "isagoo", "waxey", "lasoo", "ugu",
    "eeyga", "loo", "sii", "haddaba", "loona", "kula", "waxuu", "uga",
    "kuu", "eey", "aad", "baan", "leh", "beey", "ahna", "yahay", "mana",
    "waxaana", "dib", "maxay", "inay", "inaan", "inaana", "inaanay",
    "inaaney", "lakin", "inuu", "ayee", "kala", "kule", "kalena", "aysan",
    "hor", "wali", "isku", "halkaasoo", "kuna", "isla", "markaana",
    "ahaanba", "kamid", "kaasoo", "guud", "intaas", "muxuu", "awgeed",
    "miyuu", "iska", "kaliya", "markiiba", "kuwo", "intaysan", "wuxuuna",
    "kuwee", "kuwii", "intii", "intaa", "dabadeed", "yihiin", "gabi",
    "iskaba", "awgii", "isugu", "kuwaasoo", "kaddibna", "usoo", "lagama",
    "wuu", "lamana", "naga", "loogu", "aadka", "kii", "kana", "idiin",
    "inoo", "aynu", "yaa", "iney", "waliba", "ahayd", "waxana", "ina",
    "inan", "waxaas", "maxaad", "wixii", "uusan", "walba", "ahayn",
    "inaga", "ila", "wada", "una", "xataa", "walina", "way", "inaad",
    "kama", "ahaa", "kaga", "nagu", "aay", "ha", "aaynu", "ayaad",
    "kusoo", "aha", "sidee", "iskugu", "kalana", "kamida", "inkasta",
    "iwm", "waxayna", "maxaan", "ayaana", "kahor", "kaa", "aheyn",
    "kugu", "waxaanu", "ayey", "noo", "iga", "iigu", "ayayna",
    "inuusan", "baannu", "looga", "idin", "ahaatee", "waaye", "nooga",
    "kaleba", "maxaa", "islamarkaana", "lagala", "wuxi", "kastaba",
    "naloo", "walbo", "mise", "igu", "lakiin", "yaan", "nagala",
    "amase", "haa", "waxaad", "idiinku", "maxad", "kasii", "baad",
    "waxan", "sidii", "kuwaasi", "iskeed", "ula", "nugul", "horta",
    "intiisa", "kusii", "uugu", "sideen", "unbuu", "looguna", "inaanu",
    "markuu", "mooyee", "hadduu", "midba", "wuxu", "waayo", "iima",
    "iimaanu", "waxsoo", "laga", "innoo", "aanad", "lala", "amma",
    "waad", "kuugu", "markaa", "hasii", "lee", "anaan", "ii", "tankale",
    "weeyaan", "waase", "isoo", "haatan", "haddana", "waxaanay",
    "uuna", "inaysan", "aya", "laguna", "laguma", "ta", "inaa", "lkn",
    "haku", "hasoo", "waayahay", "kulasoo", "sheegay",
}


def clean_text(text):
    text = str(text or "").lower()
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"\S+@\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def preprocess_text(text):
    words = clean_text(text).split()
    return " ".join(word for word in words if word not in SOMALI_STOPWORDS)
