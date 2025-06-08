import pandas as pd
import os

# ---------------------------
# CONFIG
# ---------------------------
HADM_ID = 20093566
HOSP = "hosp/"  # update if needed

# ---------------------------
# Load CSV or CSV.GZ
# ---------------------------
def load_csv(name, parse_dates=None):
    path_csv = os.path.join(HOSP, f"{name}.csv")
    path_gz = os.path.join(HOSP, f"{name}.csv.gz")
    if os.path.exists(path_gz):
        return pd.read_csv(path_gz, parse_dates=parse_dates)
    elif os.path.exists(path_csv):
        return pd.read_csv(path_csv, parse_dates=parse_dates)
    else:
        raise FileNotFoundError(f"❌ File not found: {name}.csv or {name}.csv.gz")

# ---------------------------
# Load Tables
# ---------------------------
admissions = load_csv("admissions", ["admittime", "dischtime"])
transfers = load_csv("transfers", ["intime", "outtime"])
services = load_csv("services", ["transfertime"])
labevents = load_csv("labevents", ["charttime"])
d_labitems = load_csv("d_labitems")
diagnoses = load_csv("diagnoses_icd")
d_icd = load_csv("d_icd_diagnoses")
prescriptions = load_csv("prescriptions", ["starttime", "stoptime"])
emar = load_csv("emar", ["charttime"])

# ---------------------------
# Enrich and Filter by hadm_id
# ---------------------------
labevents = labevents.merge(d_labitems, on="itemid", how="left")
diagnoses = diagnoses.merge(d_icd, on="icd_code", how="left")

def enrich_and_tag(df, table_name, time_cols):
    if "hadm_id" not in df.columns:
        return pd.DataFrame()
    df = df[df["hadm_id"] == HADM_ID].copy()
    if df.empty:
        return pd.DataFrame()
    df["source_table"] = table_name
    for col in time_cols:
        if col in df.columns:
            df["event_time"] = df[col]
            break
    else:
        df["event_time"] = pd.NaT
    return df

# ---------------------------
# Apply to All Tables
# ---------------------------
tables = [
    (admissions, "admissions", ["admittime"]),
    (transfers, "transfers", ["intime"]),
    (services, "services", ["transfertime"]),
    (labevents, "labevents", ["charttime"]),
    (diagnoses, "diagnoses_icd", []),
    (prescriptions, "prescriptions", ["starttime"]),
    (emar, "emar", ["charttime"]),
]

events = [enrich_and_tag(df, name, times) for df, name, times in tables]
full_df = pd.concat(events, ignore_index=True).sort_values("event_time")

# ---------------------------
# Export
# ---------------------------
full_df.to_csv("diagnostic_raw_events.csv", index=False)
print("✅ Saved to diagnostic_raw_events.csv")
print(full_df[["event_time", "source_table"]].head(10))
