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
}


def clean_text(text):
    text = str(text or "").lower()
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"\S+@\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def preprocess_text(text):
    return clean_text(text)
