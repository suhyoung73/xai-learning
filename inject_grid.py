import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.svm import SVC
import re

star_data = pd.read_csv("star.csv")
s_input = star_data[['온도(K)', '절대등급(Mv)']].to_numpy().astype(float)
s_output = star_data['별 종류'].astype(str).to_numpy()

i_s_train, i_s_test, o_s_train, o_s_test = train_test_split(s_input, s_output, test_size=0.3, random_state=42)
model_b = make_pipeline(StandardScaler(), SVC(kernel="rbf", gamma="scale", C=2.0, random_state=42))
model_b.fit(i_s_train, o_s_train)

k_vals = np.arange(3000, 40050, 50) # 741
mv_vals = np.arange(-15, 15.05, 0.1) # 301
import itertools
grid = np.array(list(itertools.product(k_vals, mv_vals)))
preds = model_b.predict(grid)
map_chars = {'거성': 'g', '백색왜성': 'w', '주계열성': 'm'}
encoded = "".join([map_chars[p] for p in preds])

grid_js = f"""
const __ML_GRID = "{encoded}";

function classifyStar(t, mv) {{
    let k_idx = Math.round((t - 3000) / 50);
    let mv_idx = Math.round((mv - -15) / 0.1);
    
    // Clamp
    if (k_idx < 0) k_idx = 0; if (k_idx > 740) k_idx = 740;
    if (mv_idx < 0) mv_idx = 0; if (mv_idx > 300) mv_idx = 300;
    
    const flat_idx = k_idx * 301 + mv_idx;
    const c = __ML_GRID.charAt(flat_idx);
    
    if (c === 'g') return '거성';
    if (c === 'w') return '백색왜성';
    return '주계열성';
}}
"""

with open("data.js", "r", encoding="utf-8") as f:
    text = f.read()

# Replace previous __ML_GRID and classifyStar
text = re.sub(r"const __ML_GRID = .*?\}", grid_js.strip(), text, flags=re.DOTALL)

# Replace the text code snippet for Mv slider step
text = text.replace('step\\":0.5,\\"label\\":\\"절대등급', 'step\\":0.1,\\"label\\":\\"절대등급')

with open("data.js", "w", encoding="utf-8") as f:
    f.write(text)

print("Grid injection with 0.1 step successful!")
