import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.svm import SVC

# MEAT
meat_data = pd.read_csv("meat.csv")
x_col = "소고기 가격"
y_col = "돼지고기 가격"
m_input = meat_data[[x_col]].values
m_output = meat_data[y_col].values

# We need the index array for the JS side.
m_indices = np.arange(len(meat_data))
i_m_train, i_m_test, o_m_train, o_m_test, idx_m_train, idx_m_test = train_test_split(
    m_input, m_output, m_indices, test_size=0.2, random_state=42)

model_a = LinearRegression()
model_a.fit(i_m_train, o_m_train)
m_w = model_a.coef_[0]
m_b = model_a.intercept_
m_score = model_a.score(i_m_test, o_m_test) * 100

meat_arr = [[int(row[0]), int(row[1])] for row in meat_data[[x_col, y_col]].values]

# STAR
star_data = pd.read_csv("star.csv")
s_x_col = "온도(K)"
s_y_col = "절대등급(Mv)"
s_t_col = "별 종류"
s_input = star_data[[s_x_col, s_y_col]].to_numpy().astype(float)
s_output = star_data[s_t_col].astype(str).to_numpy()

s_indices = np.arange(len(star_data))
i_s_train, i_s_test, o_s_train, o_s_test, idx_s_train, idx_s_test = train_test_split(
    s_input, s_output, s_indices, test_size=0.3, random_state=42)

model_b = make_pipeline(StandardScaler(), SVC(kernel="rbf", gamma="scale", C=2.0, random_state=42))
model_b.fit(i_s_train, o_s_train)
s_score = model_b.score(i_s_test, o_s_test) * 100

star_arr = [{"t": float(row[0]), "mv": float(row[1]), "type": str(row[2])} for row in star_data[[s_x_col, s_y_col, s_t_col]].values]

out = {
    "MEAT_DATA": meat_arr,
    "MEAT_TRAIN_IDX": idx_m_train.tolist(),
    "MEAT_TEST_IDX": idx_m_test.tolist(),
    "MEAT_MODEL": {"w": float(m_w), "b": float(m_b), "score": float(m_score)},
    "STAR_DATA": star_arr,
    "STAR_TRAIN_IDX": idx_s_train.tolist(),
    "STAR_TEST_IDX": idx_s_test.tolist(),
    "STAR_MODEL": {"score": float(s_score)}
}
print(json.dumps(out))
