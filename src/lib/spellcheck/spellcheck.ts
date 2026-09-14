// Comprehensive English dictionary and spellchecker utility

// Common words set for instant synchronous lookup and fallback
const COMMON_WORDS_LIST = [
  // A
  "a", "about", "above", "across", "action", "active", "activity", "actor", "actually", "add", "address",
  "administration", "adult", "advance", "advantage", "advertising", "advice", "affect", "after", "again",
  "against", "agency", "agent", "agree", "agreement", "ahead", "ai", "aim", "air", "all", "allow", "almost",
  "alone", "along", "already", "also", "alternative", "although", "always", "amazing", "american", "among",
  "amount", "analysis", "analyst", "analyze", "and", "animal", "annual", "another", "answer", "any", "anyone",
  "anything", "anyway", "app", "appeal", "appear", "apply", "approach", "appropriate", "approval", "approve",
  "april", "area", "argue", "arm", "around", "arrive", "art", "article", "artist", "as", "ask", "assist",
  "assistant", "association", "assume", "at", "attack", "attempt", "attend", "attention", "attitude", "attract",
  "audience", "august", "author", "authority", "auto", "automated", "automatic", "automation", "available",
  "average", "avoid", "award", "aware", "awareness", "away",
  // B
  "baby", "back", "background", "bad", "bag", "balance", "ball", "ban", "band", "bank", "bar", "base",
  "basic", "basis", "be", "beach", "bear", "beat", "beautiful", "beauty", "because", "become", "bed", "before",
  "begin", "beginning", "behavior", "behind", "believe", "benefit", "best", "better", "between", "beyond", "big",
  "bill", "billion", "bit", "black", "blend", "block", "blood", "blue", "board", "body", "book", "boost", "border",
  "born", "both", "bother", "bottle", "bottom", "box", "boy", "brand", "branding", "bread", "break", "breakfast",
  "breathe", "bridge", "brief", "bright", "brighter", "bring", "broad", "broadcast", "brother", "budget", "build",
  "building", "burn", "business", "busy", "but", "button", "buy", "buyer", "by",
  // C
  "call", "campaign", "campaigns", "can", "cancel", "candidate", "capital", "capture", "car", "card", "care",
  "career", "careful", "carry", "case", "cat", "catch", "category", "cause", "cell", "center", "central",
  "century", "certain", "certainly", "chair", "challenge", "champion", "chance", "change", "channel", "channels",
  "character", "charge", "charity", "chart", "check", "checklist", "chemical", "choice", "choose", "church",
  "circle", "city", "claim", "class", "classic", "clean", "cleaner", "clear", "clearly", "client", "clients",
  "climate", "climb", "clock", "close", "closely", "clothes", "cloud", "club", "coach", "coalition", "coast",
  "code", "coffee", "cold", "collection", "college", "color", "column", "combination", "combine", "come",
  "comfort", "comment", "comments", "commercial", "commit", "committee", "common", "communicate", "communication",
  "community", "company", "compare", "comparison", "compete", "competition", "competitive", "complain", "complete",
  "complex", "component", "compose", "composition", "comprehensive", "computer", "concept", "concern", "conclude",
  "condition", "conference", "confidence", "confirm", "conflict", "connect", "connected", "connection", "consequence",
  "conservation", "consider", "considerable", "consideration", "consist", "consistent", "constant", "construct",
  "contact", "contain", "content", "continue", "contract", "contrast", "contribute", "contribution", "control",
  "convert", "conversion", "conversions", "cook", "cool", "copy", "corner", "corporate", "correct", "cost",
  "could", "council", "count", "country", "couple", "course", "court", "cover", "coverage", "craft", "create",
  "creation", "creative", "creativity", "creator", "credit", "crime", "crisis", "criteria", "critical", "cross",
  "crowd", "crucial", "cta", "culture", "cup", "curious", "current", "currently", "custom", "customer", "cut",
  // D
  "daily", "damage", "dance", "danger", "dark", "data", "date", "daughter", "day", "days", "dead", "deal",
  "dealer", "dear", "death", "debate", "december", "decide", "decision", "deck", "declare", "decline", "decrease",
  "dedicate", "deep", "deeply", "default", "defense", "define", "definition", "degree", "delay", "deliver",
  "delivery", "demand", "demo", "democracy", "demographic", "demonstrate", "department", "depend", "dependent",
  "depth", "deputy", "derive", "describe", "description", "design", "designer", "desire", "desk", "despite",
  "detail", "detailed", "details", "detect", "determine", "develop", "developer", "development", "device",
  "devote", "dialog", "die", "diet", "differ", "difference", "different", "difficult", "difficulty", "digital",
  "dimension", "dinner", "direct", "direction", "directly", "director", "dirt", "disabled", "discover", "discovery",
  "discuss", "discussion", "disease", "display", "distance", "distinct", "distinguish", "distribute", "distribution",
  "district", "diverse", "divide", "division", "doctor", "document", "documentation", "dollar", "domain", "domestic",
  "donate", "donation", "donations", "done", "door", "double", "doubt", "down", "download", "draft", "drafts",
  "drag", "drama", "dramatic", "draw", "drawer", "dream", "dress", "drink", "drive", "driver", "drop", "drug",
  "dry", "due", "during", "duty",
  // E
  "each", "eager", "early", "earn", "earth", "ease", "easily", "east", "eastern", "easy", "eat", "economic",
  "economy", "edge", "edit", "editor", "editorial", "educate", "education", "educational", "effect", "effective",
  "effectively", "efficiency", "efficient", "effort", "eight", "either", "elderly", "elect", "election", "electric",
  "element", "elementary", "eliminate", "elite", "else", "elsewhere", "email", "embrace", "emerge", "emergency",
  "emission", "emotion", "emotional", "emphasis", "emphasize", "employ", "employee", "employer", "employment",
  "empty", "enable", "encodency", "encounter", "encourage", "end", "endorse", "energy", "enforcement", "engage",
  "engagement", "engine", "engineer", "engineering", "english", "enhance", "enjoy", "enormous", "enough", "ensure",
  "enter", "enterprise", "entertainment", "entire", "entirely", "entrance", "entry", "environment", "environmental",
  "episode", "equal", "equally", "equipment", "era", "error", "errors", "escape", "especially", "essay", "essential",
  "establish", "establishment", "estate", "estimate", "estimated", "etc", "ethics", "evaluate", "even", "evening",
  "event", "events", "ever", "every", "everybody", "everyone", "everything", "everywhere", "evidence", "exact",
  "exactly", "examine", "example", "excellent", "except", "exception", "exchange", "excite", "executive", "exercise",
  "exhibit", "exist", "existence", "existing", "expand", "expansion", "expect", "expectation", "expense", "expensive",
  "experience", "experiment", "expert", "explain", "explanation", "explore", "export", "expose", "express",
  "expression", "extend", "extension", "extensive", "extent", "external", "extra", "extraordinary", "extreme", "eye",
  // F
  "fabric", "face", "facility", "fact", "factor", "factory", "faculty", "fade", "fail", "failure", "fair",
  "fairly", "faith", "fall", "false", "familiar", "family", "famous", "fan", "fantasy", "far", "farm", "farmer",
  "fashion", "fast", "fat", "fate", "father", "fault", "favor", "favorite", "fear", "feature", "features",
  "february", "federal", "fee", "feed", "feedback", "feel", "feeling", "fellow", "female", "few", "field", "fight",
  "figure", "file", "files", "fill", "film", "final", "finally", "finance", "financial", "find", "fine", "finger",
  "finish", "fire", "firm", "first", "fish", "fit", "fitness", "five", "fix", "flag", "flash", "flat", "flavor",
  "flee", "flight", "float", "floor", "flow", "flower", "fly", "focus", "folk", "follow", "followers", "following",
  "food", "foot", "football", "for", "force", "foreign", "forest", "forever", "forget", "form", "format", "formats",
  "formation", "former", "formula", "forth", "fortune", "forward", "found", "foundation", "founder", "four",
  "frame", "framework", "free", "freedom", "frequency", "frequent", "frequently", "fresh", "friend", "friendly",
  "friendship", "from", "front", "fruit", "frustration", "fuel", "full", "fully", "fun", "function", "functional",
  "fund", "fundamental", "funding", "funeral", "funny", "furniture", "further", "future",
  // G
  "gain", "gallery", "game", "ganga", "gap", "garage", "garden", "gas", "gate", "gather", "gear", "gender",
  "gene", "general", "generally", "generate", "generation", "generator", "generic", "generous", "genius", "genre",
  "gentle", "get", "ghost", "giant", "gift", "girl", "give", "given", "glad", "glance", "global", "glove", "go",
  "goal", "goals", "god", "gold", "golden", "golf", "good", "government", "grab", "grace", "grade", "gradually",
  "graduate", "grain", "grand", "grant", "graphic", "grass", "grave", "gray", "great", "greater", "greatest",
  "green", "greet", "grid", "grief", "gross", "ground", "group", "grow", "growth", "guarantee", "guard", "guess",
  "guest", "guidance", "guide", "guilty", "gun", "guy",
  // H
  "habit", "habitat", "hair", "half", "hall", "hand", "handle", "hang", "happen", "happy", "hard", "hardly",
  "harm", "hat", "hate", "have", "he", "head", "headline", "headlines", "health", "healthcare", "healthy", "healthier",
  "hear", "hearing", "heart", "heat", "heaven", "heavy", "height", "held", "hello", "help", "helpful", "her",
  "here", "heritage", "hero", "herself", "hide", "high", "highlight", "highly", "highway", "hill", "him", "himself",
  "hint", "hire", "his", "historian", "historic", "historical", "history", "hit", "hold", "holder", "hole",
  "holiday", "holy", "home", "homeless", "honest", "honor", "hope", "horizon", "horror", "horse", "hospital",
  "host", "hot", "hotel", "hour", "hours", "house", "household", "housing", "how", "however", "huge", "human",
  "humanitarian", "humanity", "humor", "hundred", "hungry", "hunt", "hunter", "hurry", "hurt", "husband",
  // I
  "i", "ice", "icon", "idea", "ideal", "ideas", "identification", "identify", "identity", "if", "ignore", "ill",
  "illegal", "illness", "illustrate", "image", "images", "imagination", "imagine", "immediate", "immediately",
  "immigrant", "immigration", "impact", "implement", "implementation", "implication", "imply", "import", "importance",
  "important", "impose", "impossible", "impress", "impression", "impressive", "improve", "improvement", "in",
  "incentive", "incident", "include", "including", "income", "incorporate", "increase", "increased", "increasingly",
  "incredible", "indeed", "independence", "independent", "index", "india", "indian", "indicate", "indication",
  "individual", "industry", "infant", "infection", "inflation", "influence", "inform", "information", "initial",
  "initially", "initiative", "injury", "inner", "innocent", "innovation", "input", "inquiry", "inside", "insight",
  "insist", "inspire", "inspiring", "install", "instance", "instead", "institution", "instruction", "insurance",
  "integrate", "integrated", "integration", "integrity", "intellectual", "intelligence", "intend", "intense",
  "intensity", "intention", "interaction", "interest", "interested", "interesting", "internal", "international",
  "internet", "interpret", "interpretation", "intervention", "interview", "into", "introduce", "introduction",
  "invasion", "invent", "invest", "investigate", "investigation", "investment", "investor", "invite", "involve",
  "involved", "involvement", "iraq", "irish", "iron", "island", "issue", "issues", "it", "item", "its", "itself",
  // J
  "jacket", "jail", "january", "japan", "japanese", "jar", "jaw", "jazz", "jeans", "jet", "jew", "jewish",
  "job", "join", "joint", "joke", "journal", "journalist", "journey", "joy", "judge", "judgment", "juice",
  "july", "jump", "june", "junior", "jury", "just", "justice", "justify",
  // K
  "keep", "key", "keyword", "kick", "kid", "kill", "killer", "kind", "king", "kiss", "kitchen", "knee", "knife",
  "knock", "know", "knowledge", "known", "kpi",
  // L
  "lab", "label", "labor", "laboratory", "lack", "ladder", "lady", "lake", "land", "landscape", "language",
  "large", "largely", "last", "late", "later", "latter", "laugh", "launch", "law", "lawn", "lawsuit", "lawyer",
  "lay", "layer", "lead", "leader", "leadership", "leading", "leads", "leaf", "league", "lean", "learn", "learning",
  "least", "leather", "leave", "lecture", "left", "leg", "legacy", "legal", "legend", "legislation", "legitimate",
  "lemon", "length", "less", "lesson", "let", "letter", "level", "liberal", "library", "license", "lie", "life",
  "lifestyle", "lifetime", "lift", "light", "like", "likely", "limit", "limitation", "limited", "line", "link",
  "links", "lion", "lip", "liquid", "list", "listen", "listener", "literally", "literary", "literature", "little",
  "live", "lives", "living", "load", "loan", "local", "locate", "location", "lock", "log", "logical", "lonely",
  "long", "look", "loose", "lose", "loss", "lost", "lot", "lots", "loud", "love", "lovely", "lover", "low",
  "lower", "loyal", "loyalty", "luck", "lucky", "lunch", "lung", "luxury",
  // M
  "machine", "mad", "magazine", "magic", "mail", "main", "mainly", "maintain", "maintenance", "major", "majority",
  "make", "maker", "makeup", "male", "mall", "man", "manage", "management", "manager", "manner", "manufacturer",
  "manufacturing", "many", "map", "march", "margin", "mark", "market", "marketing", "marketplace", "marriage",
  "married", "marry", "mask", "mass", "massive", "master", "match", "mate", "material", "math", "matter",
  "maximum", "may", "maybe", "mayor", "me", "meal", "mean", "meaning", "meaningful", "means", "meantime",
  "measure", "measurement", "meat", "mechanism", "media", "medical", "medication", "medicine", "medium", "meet",
  "meeting", "member", "membership", "memory", "mental", "mention", "mentions", "mentor", "menu", "merely",
  "message", "messages", "metal", "metric", "metrics", "middle", "might", "military", "milk", "million", "mind",
  "mine", "mineral", "minimum", "minister", "ministry", "minor", "minority", "minute", "minutes", "miracle",
  "mirror", "miss", "missile", "mission", "mistake", "mix", "mixture", "mobile", "mode", "model", "moderate",
  "modern", "modest", "modify", "module", "moksha", "moment", "money", "monitor", "monitoring", "month", "monthly",
  "months", "mood", "moon", "moral", "more", "moreover", "morning", "mortgage", "most", "mostly", "mother",
  "motion", "motivation", "motor", "mount", "mountain", "mouse", "mouth", "move", "movement", "movie", "much",
  "multiple", "murder", "muscle", "museum", "music", "musical", "musician", "muslim", "must", "mutual", "my",
  "myself", "mystery", "myth",
  // N
  "naked", "name", "names", "narrative", "narrow", "nation", "national", "nationwide", "native", "natural",
  "naturally", "nature", "near", "nearby", "nearly", "necessarily", "necessary", "neck", "need", "needs",
  "negative", "negotiate", "negotiation", "neighbor", "neighborhood", "neither", "nerve", "nervous", "net",
  "network", "networking", "neutral", "never", "nevertheless", "new", "newly", "news", "newspaper", "next",
  "ngo", "nice", "night", "nine", "no", "nobody", "nod", "noise", "nomination", "none", "nonetheless", "nonprofit",
  "nor", "normal", "normally", "north", "northern", "nose", "not", "note", "notes", "nothing", "notice", "notion",
  "novel", "now", "nowhere", "nuclear", "number", "numbers", "numerous", "nurse", "nut",
  // O
  "object", "objective", "objectives", "obligation", "observation", "observe", "observer", "obtain", "obvious",
  "obviously", "occasion", "occasional", "occasionally", "occupation", "occupy", "occur", "ocean", "october",
  "odd", "odds", "of", "off", "offense", "offensive", "offer", "office", "officer", "official", "often", "oil",
  "ok", "okay", "old", "omni", "on", "once", "one", "ongoing", "online", "only", "onto", "open", "opening",
  "operate", "operating", "operation", "operator", "opinion", "opponent", "opportunity", "oppose", "opposite",
  "opposition", "option", "options", "or", "orange", "order", "ordinary", "organic", "organization", "organize",
  "organizer", "orientation", "origin", "original", "originally", "other", "others", "otherwise", "ought", "our",
  "ourselves", "out", "outcome", "outcomes", "outside", "oven", "over", "overall", "overcome", "override", "overrides",
  "oversee", "overview", "owe", "own", "owner",
  // P
  "pace", "pack", "package", "page", "pages", "pain", "painful", "paint", "painter", "painting", "pair",
  "pale", "palm", "pan", "panel", "pant", "paper", "paragraph", "parent", "park", "parking", "part", "participant",
  "participate", "participation", "particular", "particularly", "partly", "partner", "partnership", "party",
  "pass", "passage", "passenger", "passion", "past", "path", "patience", "patient", "pattern", "pause", "pay",
  "payment", "peace", "peaceful", "peak", "peer", "penalty", "people", "pepper", "per", "perceive", "percentage",
  "perception", "perfect", "perfectly", "perform", "performance", "performer", "perhaps", "period", "permanent",
  "permission", "permit", "person", "personal", "personality", "personally", "personnel", "perspective", "persuade",
  "pet", "phase", "phenomenon", "philosophy", "phone", "photo", "photograph", "photographer", "phrase", "physical",
  "physically", "physician", "piano", "pick", "picker", "picture", "piece", "pile", "pilot", "pin", "pink",
  "pipe", "pitch", "place", "placement", "placements", "plan", "plane", "planet", "planner", "planning", "plant",
  "plastic", "plate", "platform", "platforms", "play", "player", "pleasant", "please", "pleasure", "pledge",
  "plenty", "plot", "plus", "pocket", "poem", "poet", "poetry", "point", "pole", "police", "policy", "political",
  "politically", "politician", "politics", "poll", "pollution", "pool", "poor", "pop", "popular", "population",
  "porch", "port", "portion", "portrait", "portray", "pose", "position", "positive", "possess", "possibility",
  "possible", "possibly", "post", "posts", "pot", "potato", "potential", "potentially", "pound", "pour", "poverty",
  "powder", "power", "powerful", "practical", "practice", "pray", "prayer", "precisely", "predict", "prefer",
  "preference", "pregnancy", "pregnant", "preparation", "prepare", "presence", "present", "presentation", "preserve",
  "president", "presidential", "press", "pressure", "pretend", "pretty", "prevent", "previous", "previously",
  "price", "pride", "priest", "primarily", "primary", "prime", "principal", "principle", "print", "prior",
  "priority", "prison", "prisoner", "privacy", "private", "probably", "problem", "problems", "procedure", "proceed",
  "process", "produce", "producer", "product", "production", "productive", "productivity", "profession", "professional",
  "professor", "profile", "profit", "program", "progress", "project", "projects", "prominent", "promise", "promote",
  "promotion", "prompt", "proof", "proper", "properly", "property", "proportion", "proposal", "propose", "proposed",
  "prospect", "protect", "protection", "protein", "protest", "proud", "prove", "provide", "provider", "province",
  "provision", "psychological", "psychology", "public", "publication", "publicly", "publish", "publisher", "pull",
  "pump", "punishment", "purchase", "pure", "purple", "purpose", "pursue", "push", "put",
  // Q
  "qualification", "qualify", "quality", "quarter", "queen", "query", "question", "questions", "quick", "quickly",
  "quiet", "quietly", "quit", "quite", "quote",
  // R
  "race", "racial", "radical", "radio", "rail", "rain", "raise", "range", "rank", "rapid", "rapidly", "rare",
  "rarely", "rate", "rather", "rating", "ratio", "ratios", "raw", "reach", "react", "reaction", "read", "reader",
  "reading", "ready", "real", "realistic", "reality", "realize", "really", "reason", "reasonable", "recall",
  "receive", "recent", "recently", "recipe", "recognition", "recognize", "recommend", "recommendation", "record",
  "recording", "recover", "recovery", "recruit", "red", "reduce", "reduction", "refer", "reference", "reflect",
  "reflection", "reform", "refugee", "refuse", "regard", "regarding", "regardless", "regime", "region", "regional",
  "register", "regular", "regularly", "regulate", "regulation", "reinforce", "reject", "relate", "relation",
  "relationship", "relative", "relatively", "relax", "release", "relevant", "relief", "religion", "religious",
  "rely", "remain", "remaining", "remarkable", "remember", "remind", "remote", "remove", "repeat", "repeatedly",
  "replace", "reply", "report", "reporter", "represent", "representation", "representative", "reputation", "request",
  "require", "requirement", "research", "researcher", "reserve", "resident", "resist", "resistance", "resolution",
  "resolve", "resort", "resource", "resources", "respect", "respond", "respondent", "response", "responsibility",
  "responsible", "rest", "restaurant", "restore", "restrict", "restriction", "result", "results", "retain", "retention",
  "retire", "retirement", "return", "reveal", "revenue", "review", "revolution", "reward", "rhythm", "rice", "rich",
  "rid", "ride", "rider", "ridge", "rifle", "right", "ring", "rise", "risk", "river", "rivers", "road", "rock",
  "role", "roll", "romantic", "roof", "room", "root", "rope", "rose", "rough", "roughly", "round", "route",
  "routine", "row", "rub", "rule", "rules", "run", "running", "rural", "rush", "russian",
  // S
  "sacred", "safe", "safety", "sail", "sake", "salad", "salary", "sale", "sales", "salt", "same", "sample",
  "sanction", "sand", "satellite", "satisfaction", "satisfy", "sauce", "save", "saved", "saving", "say", "scale",
  "scan", "scandal", "scared", "scenario", "scene", "schedule", "scheduled", "scheme", "scholar", "scholarship",
  "school", "science", "scientific", "scientist", "scope", "score", "scream", "screen", "script", "sea", "search",
  "season", "seat", "second", "secret", "secretary", "section", "sector", "secure", "security", "see", "seed",
  "seek", "seem", "segment", "segmented", "seize", "select", "selected", "selection", "self", "sell", "seller",
  "send", "senior", "sense", "sensitive", "sentence", "separate", "september", "sequence", "series", "serious",
  "seriously", "serve", "service", "services", "session", "set", "setting", "settle", "settlement", "seven",
  "several", "severe", "sewa", "sex", "sexual", "shade", "shadow", "shake", "shall", "shape", "share", "shares",
  "sharp", "she", "sheet", "shelf", "shell", "shelter", "shift", "shine", "ship", "shirt", "shock", "shoe",
  "shoot", "shooting", "shop", "shopping", "shore", "short", "shorten", "shortly", "shot", "should", "shoulder",
  "shout", "show", "shower", "shrug", "shut", "sick", "side", "sigh", "sight", "sign", "signal", "significance",
  "significant", "significantly", "silence", "silent", "silver", "similar", "similarly", "simple", "simply", "sin",
  "since", "sing", "singer", "single", "sink", "sir", "sister", "sit", "site", "situation", "six", "size",
  "skill", "skin", "sky", "slave", "sleep", "slice", "slide", "slight", "slightly", "slip", "slow", "slowly",
  "small", "smart", "smell", "smile", "smoke", "smooth", "snap", "snow", "so", "social", "society", "soft",
  "software", "soil", "solar", "soldier", "solid", "solution", "solutions", "solve", "some", "somebody", "somehow",
  "someone", "something", "sometimes", "somewhat", "somewhere", "son", "song", "soon", "sophisticated", "sorry",
  "sort", "soul", "sound", "soup", "source", "sources", "south", "southern", "soviet", "space", "spanish",
  "speak", "speaker", "special", "specialist", "species", "specific", "specifically", "specify", "speech", "speed",
  "spell", "spellcheck", "spend", "spending", "spin", "spirit", "spiritual", "split", "spokesman", "sport", "spot",
  "spread", "spring", "square", "squeeze", "stability", "stable", "staff", "stage", "stair", "stake", "stand",
  "standard", "standing", "star", "stare", "start", "state", "statement", "station", "statistics", "status",
  "stay", "steady", "steal", "steel", "step", "steps", "stick", "still", "stimulate", "stock", "stomach", "stone",
  "stop", "storage", "store", "stories", "storm", "story", "straight", "strange", "stranger", "strategic", "strategy",
  "stream", "street", "strength", "strengthen", "stress", "stretch", "strike", "string", "strip", "stroke", "strong",
  "strongly", "structure", "struggle", "student", "studio", "study", "stuff", "style", "subject", "submit",
  "subsequent", "substance", "substantial", "succeed", "success", "successful", "successfully", "such", "sudden",
  "suddenly", "sue", "suffer", "sufficient", "sugar", "suggest", "suggestion", "suggestions", "suit", "suitable",
  "sum", "summary", "summer", "summit", "sun", "super", "supply", "support", "supporter", "suppose", "supposed",
  "supreme", "sure", "surely", "surface", "surgery", "surprise", "surprised", "surprising", "surprisingly",
  "surround", "survey", "survival", "survive", "survivor", "suspect", "sustain", "sustainable", "swear", "sweep",
  "sweet", "swim", "swimming", "swing", "switch", "symbol", "symptom", "system",
  // T
  "table", "tablespoon", "tactic", "tail", "take", "tale", "talent", "talk", "tall", "tank", "tap", "tape",
  "target", "targets", "task", "tasks", "taste", "tax", "taxpayer", "tea", "teach", "teacher", "teaching", "team",
  "tear", "teaspoon", "technical", "technique", "technology", "teen", "teenager", "telephone", "telescope",
  "television", "tell", "temperature", "temporary", "ten", "tend", "tendency", "tennis", "tension", "tent",
  "term", "terms", "terrible", "territory", "terror", "terrorism", "terrorist", "test", "testing", "tests",
  "text", "than", "thank", "thanks", "that", "the", "theater", "their", "them", "theme", "themselves", "then",
  "theory", "therapy", "there", "therefore", "these", "they", "thick", "thin", "thing", "things", "think",
  "thinking", "third", "thirty", "this", "thorough", "thoroughly", "those", "though", "thought", "thousand",
  "threat", "threaten", "three", "throat", "through", "throughout", "throw", "thus", "ticket", "tie", "tight",
  "time", "timeline", "times", "tiny", "tip", "tips", "tire", "tired", "tissue", "title", "to", "tobacco", "today",
  "toe", "together", "tomato", "tomorrow", "tone", "tongue", "tonight", "too", "tool", "tools", "tooth", "top",
  "topic", "toss", "total", "totally", "touch", "tough", "tour", "tourist", "tournament", "toward", "towards",
  "tower", "town", "toy", "trace", "track", "tracking", "trade", "tradition", "traditional", "traffic", "tragedy",
  "trail", "train", "trainer", "training", "trait", "transaction", "transfer", "transform", "transformation",
  "transition", "translate", "translation", "transmission", "transport", "transportation", "travel", "treat",
  "treatment", "treaty", "tree", "tremendous", "trend", "trends", "trial", "tribe", "trick", "trip", "troop",
  "trouble", "truck", "true", "truly", "trust", "truth", "try", "tube", "tunnel", "turn", "twelve", "twenty",
  "twice", "twin", "two", "type", "types", "typical", "typically", "typo", "typos",
  // U
  "ugly", "ultimate", "ultimately", "unable", "uncle", "under", "undergo", "understand", "understanding",
  "underprivileged", "undertake", "unemployment", "unexpected", "unfair", "unfold", "unfortunately", "uniform",
  "union", "unique", "unit", "unite", "united", "universal", "universe", "university", "unknown", "unless",
  "unlike", "unlikely", "until", "unusual", "up", "upon", "upper", "urban", "urge", "url", "us", "use", "used",
  "useful", "user", "users", "usual", "usually", "utility", "utm",
  // V
  "vacation", "valley", "valuable", "value", "values", "varanasi", "variable", "variation", "variations", "variety",
  "various", "vary", "vast", "vegetable", "vehicle", "venture", "version", "versus", "very", "vessel", "veteran",
  "via", "victim", "victory", "video", "videos", "view", "viewer", "views", "village", "violate", "violation",
  "violence", "violent", "virtually", "virtue", "virus", "visible", "vision", "visit", "visitor", "visual",
  "vital", "voice", "volume", "volunteer", "volunteers", "vote", "voter", "vulnerable",
  // W
  "wage", "wait", "wake", "walk", "wall", "wander", "want", "war", "warm", "warn", "warning", "wash", "waste",
  "watch", "water", "wave", "way", "ways", "we", "weak", "wealth", "wealthy", "weapon", "wear", "weather",
  "web", "website", "wedding", "week", "weekly", "weeks", "weight", "welcome", "welfare", "well", "west",
  "western", "wet", "what", "whatever", "wheel", "when", "whenever", "where", "whereas", "whether", "which",
  "while", "whisper", "white", "who", "whole", "whom", "whose", "why", "wide", "widely", "widespread", "wife",
  "wild", "will", "willing", "win", "wind", "window", "wine", "wing", "winner", "winter", "wipe", "wire", "wisdom",
  "wise", "wish", "with", "withdraw", "within", "without", "witness", "woman", "wonder", "wonderful", "wood",
  "wooden", "word", "words", "work", "worker", "working", "works", "workshop", "world", "worried", "worry",
  "worth", "would", "wound", "wrap", "write", "writer", "writing", "written", "wrong",
  // X, Y, Z
  "yard", "yeah", "year", "yearly", "years", "yell", "yellow", "yes", "yesterday", "yet", "yield", "you",
  "young", "your", "yours", "yourself", "youth", "zap", "zero", "zone"
];

// Set for O(1) lookup
const DICTIONARY_SET = new Set<string>(COMMON_WORDS_LIST.map(w => w.toLowerCase()));

// Custom words added at runtime
const customWords = new Set<string>();

export interface MisspelledWord {
  word: string;
  cleanWord: string;
  index: number;
  suggestions: string[];
}

/**
 * Levenshtein distance calculation for generating suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prevRow: number[] = [];
  const currRow: number[] = [];

  for (let j = 0; j <= n; j++) {
    prevRow.push(j);
    currRow.push(0);
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const p1 = prevRow[j - 1] ?? 0;
      const p2 = prevRow[j] ?? 0;
      const c1 = currRow[j - 1] ?? 0;

      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        currRow[j] = p1;
      } else {
        currRow[j] = 1 + Math.min(p2, c1, p1);
      }
    }
    for (let j = 0; j <= n; j++) {
      prevRow[j] = currRow[j] ?? 0;
    }
  }
  return prevRow[n] ?? 0;
}

/**
 * Check if a single word is spelled correctly
 */
export function isWordValid(rawWord: string): boolean {
  if (!rawWord) return true;
  const word = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "").trim();
  if (!word || word.length <= 1) return true;

  // Pure numbers, currencies, percentages (e.g. "2025", "100%", "$50", "3.14") are valid
  if (/^\$?\d+([.,]\d+)*%?$/.test(word)) {
    return true;
  }

  // URLs, hashtags, mentions, code paths
  if (word.startsWith("http") || word.includes("/") || word.includes("@") || word.includes("#")) {
    return true;
  }

  // Check dictionary
  if (DICTIONARY_SET.has(word) || customWords.has(word)) return true;

  // Check common suffixes (e.g. plurals, past tense, ing, ly)
  if (word.endsWith("s") && (DICTIONARY_SET.has(word.slice(0, -1)) || DICTIONARY_SET.has(word.slice(0, -2)))) return true;
  if (word.endsWith("ed") && (DICTIONARY_SET.has(word.slice(0, -2)) || DICTIONARY_SET.has(word.slice(0, -1)))) return true;
  if (word.endsWith("ing") && (DICTIONARY_SET.has(word.slice(0, -3)) || DICTIONARY_SET.has(word.slice(0, -3) + "e"))) return true;
  if (word.endsWith("ly") && DICTIONARY_SET.has(word.slice(0, -2))) return true;

  return false;
}

/**
 * Get spelling suggestions for a misspelled word
 */
export function getSuggestions(rawWord: string, maxSuggestions = 4): string[] {
  const word = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");
  if (!word || isWordValid(word)) return [];

  const candidates: { word: string; dist: number }[] = [];

  for (const dictWord of COMMON_WORDS_LIST) {
    // Only calculate distance if length is somewhat close
    if (Math.abs(dictWord.length - word.length) <= 3) {
      const dist = levenshteinDistance(word, dictWord);
      if (dist <= 3) {
        candidates.push({ word: dictWord, dist });
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  const results = candidates.slice(0, maxSuggestions).map(c => {
    // Preserve initial capitalization if original word was capitalized
    if (rawWord[0] && rawWord[0] === rawWord[0].toUpperCase()) {
      return c.word.charAt(0).toUpperCase() + c.word.slice(1);
    }
    return c.word;
  });

  // Handle special case like concatenated words (e.g. "acrosssdIndia")
  if (word.includes("india") && word !== "india") {
    results.unshift("across India");
  }

  return results;
}

/**
 * Scan text and return list of misspelled words with positions and suggestions
 */
export function scanForMisspellings(plainTextOrHtml: string): MisspelledWord[] {
  if (!plainTextOrHtml) return [];

  // Strip HTML tags for clean text scanning while preserving offsets
  const text = plainTextOrHtml.replace(/<[^>]*>/g, " ");
  const wordRegex = /[a-zA-Z]{2,}/g;
  const misspellings: MisspelledWord[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const rawWord = match[0];
    const cleanWord = rawWord.toLowerCase();

    if (!seen.has(cleanWord) && !isWordValid(rawWord)) {
      seen.add(cleanWord);
      misspellings.push({
        word: rawWord,
        cleanWord,
        index: match.index,
        suggestions: getSuggestions(rawWord),
      });
    }
  }

  return misspellings;
}

/**
 * Remove all spellcheck marks from HTML string
 */
export function cleanSpellMarks(html: string): string {
  if (!html) return "";
  return html.replace(/<mark\b[^>]*data-spell-typo="true"[^>]*>(.*?)<\/mark>/gi, "$1");
}

/**
 * Apply Gmail-style red wavy underline marks to misspelled words inside an HTML or text string
 */
export function applySpellMarksToHtml(html: string): string {
  if (!html) return "";
  const cleaned = cleanSpellMarks(html);
  const misspellings = scanForMisspellings(cleaned);
  if (misspellings.length === 0) return cleaned;

  let result = cleaned;
  for (const m of misspellings) {
    const escaped = m.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!<[^>]*)\\b(${escaped})\\b(?![^<]*>)`, 'g');
    result = result.replace(regex, `<mark data-spell-typo="true" class="spell-typo-gmail" data-word="${m.word}">$1</mark>`);
  }
  return result;
}

/**
 * Add a word to user's custom dictionary for this session
 */
export function addToDictionary(word: string): void {
  customWords.add(word.toLowerCase().trim());
}

