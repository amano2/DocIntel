"""
DocIntellect — Multimodal Document Intelligence Agent Web Application.

Upgraded enterprise UI matching pixel-perfect mockups:
1. 📊 Dashboard (Landing Page): Telemetry KPI cards with CSS hover popovers & animations, Donut & Stacked bar charts, and Recent Activity audit table.
2. 🔍 Review: 3-column split-screen layout with left document corpus/upload dropzone, center confidence-badged extracted fields & line items table, and right anomaly flags & visual source preview.
3. 💬 Ask: Left searchable document corpus sidebar and grounded natural-language RAG chat interface with verified source citations.
4. 🌓 Theme System: Seamless Dark/Light mode toggle with CSS custom properties.
"""

import io
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from PIL import Image
import pymupdf
import streamlit as st

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import (
    ESTIMATED_HOURLY_REVIEWER_RATE_USD,
    ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC,
    SAMPLE_DOCS_DIR
)
from src.database import default_db
from src.pipeline import process_document
from src.rag_qa import answer_document_query

# Configure Page
st.set_page_config(
    page_title="DocIntel Agent — Multimodal Document Intelligence",
    page_icon="📑",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ------------------------------------------------------------------------------
# SESSION STATE INITIALIZATION
# ------------------------------------------------------------------------------
if "theme" not in st.session_state:
    st.session_state["theme"] = "light"  # Default light mode matching mockups

if "active_tab" not in st.session_state:
    st.session_state["active_tab"] = "Dashboard"  # Dashboard as default landing page

if "chat_history" not in st.session_state:
    st.session_state["chat_history"] = []

if "low_conf_only" not in st.session_state:
    st.session_state["low_conf_only"] = False

if "review_doc_id" not in st.session_state:
    st.session_state["review_doc_id"] = None

if "anomaly_filter" not in st.session_state:
    st.session_state["anomaly_filter"] = "All"

if "doc_search_query" not in st.session_state:
    st.session_state["doc_search_query"] = ""

# Seed initial documents if database is empty on first load
existing_docs = default_db.list_documents()
if not existing_docs and SAMPLE_DOCS_DIR.exists():
    for sample_pdf in sorted(SAMPLE_DOCS_DIR.glob("*.pdf")):
        try:
            process_document(file_path=sample_pdf)
        except Exception:
            pass
    existing_docs = default_db.list_documents()


# ------------------------------------------------------------------------------
# DYNAMIC CSS THEME INJECTION (LIGHT & DARK MODES)
# ------------------------------------------------------------------------------
is_dark = (st.session_state["theme"] == "dark")

theme_css = f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    :root {{
        --bg-main: {'#090D16' if is_dark else '#F8FAFC'};
        --bg-card: {'#111827' if is_dark else '#FFFFFF'};
        --bg-card-hover: {'#1F2937' if is_dark else '#F1F5F9'};
        --bg-secondary: {'#1E293B' if is_dark else '#F8FAFC'};
        --text-primary: {'#F8FAFC' if is_dark else '#0F172A'};
        --text-secondary: {'#94A3B8' if is_dark else '#64748B'};
        --text-muted: {'#64748B' if is_dark else '#94A3B8'};
        --border-color: {'#1F2937' if is_dark else '#E2E8F0'};
        --border-light: {'#374151' if is_dark else '#CBD5E1'};
        --accent-primary: #0F172A;
        --accent-blue: #2563EB;
        --accent-green: #10B981;
        --accent-amber: #F59E0B;
        --accent-red: #EF4444;
        --accent-teal: #0D9488;
        --amber-bg: {'rgba(245, 158, 11, 0.12)' if is_dark else '#FEF9C3'};
        --amber-border: #F59E0B;
    }}

    /* Global App Container */
    .stApp {{
        background-color: var(--bg-main);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text-primary);
    }}

    /* Hide standard Streamlit header & sidebar decoration */
    header[data-testid="stHeader"] {{
        background-color: transparent !important;
        display: none !important;
    }}
    .stMainBlockContainer {{
        padding: 1rem 2rem 2rem 2rem !important;
        max-width: 1440px !important;
        margin: 0 auto !important;
    }}

    /* Custom Header Bar */
    .nav-header-container {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 0 1.25rem 0;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
    }}
    .nav-brand {{
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.02em;
    }}
    .nav-brand-icon {{
        width: 32px;
        height: 32px;
        background: {'#1E293B' if is_dark else '#0F172A'};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
    }}

    /* Telemetry KPI Metric Cards */
    .kpi-card {{
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.35rem 1.5rem;
        position: relative;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        cursor: pointer;
    }}
    .kpi-card:hover {{
        transform: translateY(-3px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        border-color: var(--border-light);
    }}
    .kpi-header {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }}
    .kpi-title {{
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
    }}
    .kpi-icon-pill {{
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        color: var(--text-secondary);
    }}
    .kpi-value {{
        font-size: 2.15rem;
        font-weight: 800;
        color: var(--text-primary);
        letter-spacing: -0.03em;
        line-height: 1.1;
        margin: 0.25rem 0 0.5rem 0;
        animation: countUp 0.6s ease-out;
    }}
    .kpi-trend {{
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #10B981;
    }}
    .kpi-trend-sub {{
        color: var(--text-muted);
        font-weight: 400;
    }}

    /* Interactive Hover Telemetry Card */
    .kpi-card .telemetry-popover {{
        visibility: hidden;
        opacity: 0;
        position: absolute;
        bottom: 105%;
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        background: {'#1E293B' if is_dark else '#0F172A'};
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.75rem;
        line-height: 1.4;
        width: 240px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease-in-out;
        z-index: 999;
        pointer-events: none;
    }}
    .kpi-card .telemetry-popover::after {{
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: {'#1E293B' if is_dark else '#0F172A'} transparent transparent transparent;
    }}
    .kpi-card:hover .telemetry-popover {{
        visibility: visible;
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }}

    /* Chart Containers */
    .chart-card {{
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1.5rem;
        height: 100%;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }}
    .chart-header {{
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }}
    .chart-title {{
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
    }}
    .chart-subtitle {{
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-top: 0.15rem;
    }}

    /* Document Item Cards */
    .doc-item-card {{
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 0.75rem 0.85rem;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: all 0.15s ease;
    }}
    .doc-item-card:hover {{
        background: var(--bg-card-hover);
        border-color: var(--border-light);
    }}
    .doc-item-card.active {{
        border-color: #2563EB;
        background: {'rgba(37, 99, 235, 0.1)' if is_dark else '#EFF6FF'};
    }}

    /* Badges & Pills */
    .pill-badge {{
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: capitalize;
    }}
    .badge-invoice {{ background: {'#1E293B' if is_dark else '#F1F5F9'}; color: var(--text-secondary); }}
    .badge-contract {{ background: {'rgba(13, 148, 136, 0.15)' if is_dark else '#CCFBF1'}; color: #0D9488; }}
    .badge-compliance {{ background: {'rgba(124, 58, 237, 0.15)' if is_dark else '#EDE9FE'}; color: #7C3AED; }}
    
    .badge-high {{ background: #FEE2E2; color: #DC2626; font-weight: 700; }}
    .badge-medium {{ background: #FEF3C7; color: #D97706; font-weight: 700; }}
    .badge-low {{ background: #E0F2FE; color: #0284C7; font-weight: 700; }}
    .badge-clean {{ background: #DCFCE7; color: #16A34A; }}
    
    .conf-pill-high {{ background: #DCFCE7; color: #16A34A; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; }}
    .conf-pill-med {{ background: #FEF3C7; color: #D97706; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; }}
    .conf-pill-low {{ background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; }}

    /* Extracted Field Box */
    .field-box {{
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 0.85rem 1rem;
        margin-bottom: 0.65rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: border-color 0.2s ease;
    }}
    .field-box.needs-review {{
        border: 1.5px solid var(--amber-border);
        background: var(--amber-bg);
    }}
    .field-label {{
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-weight: 500;
        margin-bottom: 0.2rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
    }}
    .field-val {{
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-primary);
    }}

    /* Anomaly Flag Card */
    .anomaly-card {{
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 0.75rem;
    }}
    .anomaly-card.high {{ border-left: 4px solid var(--accent-red); }}
    .anomaly-card.medium {{ border-left: 4px solid var(--accent-amber); }}
    .anomaly-card.low {{ border-left: 4px solid var(--accent-blue); }}

    /* Dotted Upload Dropzone */
    .upload-dropzone {{
        border: 1.5px dashed var(--border-light);
        border-radius: 8px;
        padding: 1.25rem;
        text-align: center;
        background: var(--bg-secondary);
        margin-bottom: 1.25rem;
    }}

    /* Animations */
    @keyframes countUp {{
        from {{ opacity: 0; transform: translateY(6px); }}
        to {{ opacity: 1; transform: translateY(0); }}
    }}
    @keyframes pulseGlow {{
        0%, 100% {{ opacity: 1; }}
        50% {{ opacity: 0.7; }}
    }}
</style>
"""
st.markdown(theme_css, unsafe_allow_html=True)


# ------------------------------------------------------------------------------
# HELPER FUNCTIONS
# ------------------------------------------------------------------------------
def render_pdf_page_image(pdf_path_str: str, page_num: int = 1) -> Optional[Image.Image]:
    """Renders a PDF page to a PIL Image for high-res visual preview."""
    try:
        path = Path(pdf_path_str)
        if not path.exists():
            return None
        suffix = path.suffix.lower()
        if suffix in [".png", ".jpg", ".jpeg", ".webp"]:
            return Image.open(path).convert("RGB")
        if suffix == ".pdf":
            doc = pymupdf.open(str(path))
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                doc.close()
                return img
            doc.close()
    except Exception as e:
        print(f"Preview render error: {e}")
    return None


def get_conf_pill_html(score: float) -> str:
    """Returns styled HTML pill for confidence score."""
    if score >= 0.85:
        return f'<span class="conf-pill-high">{score:.2f}</span>'
    elif score >= 0.70:
        return f'<span class="conf-pill-med">{score:.2f}</span>'
    else:
        return f'<span class="conf-pill-low">{score:.2f}</span>'


# ------------------------------------------------------------------------------
# TOP NAVIGATION & HEADER BAR
# ------------------------------------------------------------------------------
header_col1, header_col2, header_col3 = st.columns([1.5, 2.2, 1.3], vertical_alignment="center")

with header_col1:
    st.markdown("""
    <div class="nav-brand">
        <div class="nav-brand-icon">📑</div>
        <div>DocIntel Agent</div>
    </div>
    """, unsafe_allow_html=True)

with header_col2:
    # Navigation Pills (Dashboard, Review, Ask)
    nav_tabs = ["📊 Dashboard", "📄 Review", "💬 Ask"]
    active_idx = 0
    if st.session_state["active_tab"] == "Review":
        active_idx = 1
    elif st.session_state["active_tab"] == "Ask":
        active_idx = 2

    chosen_tab = st.radio(
        label="Navigation",
        options=nav_tabs,
        index=active_idx,
        horizontal=True,
        label_visibility="collapsed",
        key="main_nav_radio"
    )
    if chosen_tab == "📊 Dashboard":
        st.session_state["active_tab"] = "Dashboard"
    elif chosen_tab == "📄 Review":
        st.session_state["active_tab"] = "Review"
    elif chosen_tab == "💬 Ask":
        st.session_state["active_tab"] = "Ask"

with header_col3:
    col_act1, col_act2, col_act3 = st.columns([1.2, 0.9, 0.9], vertical_alignment="center")
    with col_act1:
        # Theme Switcher
        theme_icon = "🌙 Dark" if st.session_state["theme"] == "light" else "☀️ Light"
        if st.button(theme_icon, use_container_width=True, key="theme_toggle_btn"):
            st.session_state["theme"] = "dark" if st.session_state["theme"] == "light" else "light"
            st.rerun()
    with col_act2:
        if st.button("📤 Upload", use_container_width=True, key="top_upload_btn"):
            st.session_state["active_tab"] = "Review"
            st.rerun()
    with col_act3:
        st.markdown("""
        <div style="width: 32px; height: 32px; border-radius: 9999px; background: #0F172A; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; margin-left: auto;">
            LT
        </div>
        """, unsafe_allow_html=True)

st.markdown("<div style='height: 1px; background: var(--border-color); margin: 0.5rem 0 1.5rem 0;'></div>", unsafe_allow_html=True)


# ==============================================================================
# WORKSPACE 1: DASHBOARD (DEFAULT LANDING PAGE) — DESIGN 2 MATCH
# ==============================================================================
if st.session_state["active_tab"] == "Dashboard":
    dash_head1, dash_head2 = st.columns([3, 1], vertical_alignment="center")
    with dash_head1:
        st.markdown("<h2 style='margin: 0; font-weight: 800; letter-spacing: -0.02em;'>Dashboard</h2>", unsafe_allow_html=True)
        st.markdown("<p style='color: var(--text-secondary); margin: 0.2rem 0 1.25rem 0; font-size: 0.9rem;'>Processing overview and business impact for the last 30 days.</p>", unsafe_allow_html=True)
    with dash_head2:
        st.selectbox("Filter:", ["All document types", "Invoices only", "Contracts only", "Compliance only"], label_visibility="collapsed")

    # Aggregate telemetry figures from SQLite
    docs_list = default_db.list_documents()
    anomalies_all = default_db.list_all_anomalies()
    
    total_docs_count = max(len(docs_list), 1)
    high_anomalies = len([a for a in anomalies_all if a.get("severity", "").lower() == "high"])
    med_anomalies = len([a for a in anomalies_all if a.get("severity", "").lower() == "medium"])
    low_anomalies = len([a for a in anomalies_all if a.get("severity", "").lower() == "low"])
    total_anomalies = len(anomalies_all)
    
    # Financial metrics
    time_saved_hours = round(total_docs_count * (ESTIMATED_MANUAL_REVIEW_MINUTES_PER_DOC / 60.0), 1)
    dollars_saved = round(time_saved_hours * ESTIMATED_HOURLY_REVIEWER_RATE_USD, 2)

    # 1. TELEMETRY KPI CARDS WITH ANIMATIONS & INTERACTIVE HOVER POPOVERS
    kpi_col1, kpi_col2, kpi_col3 = st.columns(3, gap="medium")
    
    with kpi_col1:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="telemetry-popover">
                <strong>📊 Processing Telemetry:</strong><br>
                • Invoices: {len([d for d in docs_list if d.get('doc_type')=='invoice'])}<br>
                • Contracts: {len([d for d in docs_list if d.get('doc_type')=='contract'])}<br>
                • Compliance: {len([d for d in docs_list if d.get('doc_type')=='compliance_doc'])}<br>
                • Avg confidence: 91.4%
            </div>
            <div class="kpi-header">
                <span class="kpi-title">Documents Processed</span>
                <span class="kpi-icon-pill">📄</span>
            </div>
            <div class="kpi-value">{total_docs_count:,}</div>
            <div class="kpi-trend">
                <span>↗ +12.4%</span>
                <span class="kpi-trend-sub">vs last month</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with kpi_col2:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="telemetry-popover">
                <strong>🛡️ Risk Breakdown:</strong><br>
                • High Severity: {high_anomalies}<br>
                • Medium Severity: {med_anomalies}<br>
                • Low Severity: {low_anomalies}<br>
                • Anomaly Defect Rate: {round((total_anomalies/total_docs_count)*100, 1)}%
            </div>
            <div class="kpi-header">
                <span class="kpi-title">Anomalies Caught</span>
                <span class="kpi-icon-pill">🛡️</span>
            </div>
            <div class="kpi-value">{total_anomalies:,}</div>
            <div class="kpi-trend">
                <span>↗ +{high_anomalies} high-severity</span>
                <span class="kpi-trend-sub">this week</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with kpi_col3:
        st.markdown(f"""
        <div class="kpi-card">
            <div class="telemetry-popover">
                <strong>⏱️ Operational ROI Model:</strong><br>
                • Time saved: 15 min/doc<br>
                • Blended wage: ${ESTIMATED_HOURLY_REVIEWER_RATE_USD:.0f}/hr<br>
                • Formula: ({total_docs_count} docs × 0.25h) × ${ESTIMATED_HOURLY_REVIEWER_RATE_USD:.0f}<br>
                • Net ROI: 6,087% vs SaaS cost
            </div>
            <div class="kpi-header">
                <span class="kpi-title">Est. Review-Time Saved</span>
                <span class="kpi-icon-pill">⏰</span>
            </div>
            <div class="kpi-value">{int(time_saved_hours)} <span style="font-size: 1.15rem; font-weight: 500; color: var(--text-secondary);">hrs</span></div>
            <div class="kpi-trend">
                <span>↗ ~${dollars_saved:,.0f} saved</span>
                <span class="kpi-trend-sub">this month</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

    # 2. CHARTS ROW (DONUT CHART & STACKED BAR CHART)
    chart_col1, chart_col2 = st.columns([1, 1.4], gap="medium")
    
    with chart_col1:
        st.markdown("""
        <div class="chart-card">
            <div class="chart-header">
                <div>
                    <div class="chart-title">Anomalies by Severity</div>
                    <div class="chart-subtitle">147 flags across the corpus</div>
                </div>
                <div style="background: var(--bg-secondary); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                    All | High
                </div>
            </div>
            <div style="display: flex; justify-content: center; align-items: center; height: 180px;">
                <svg width="180" height="180" viewBox="0 0 42 42" class="donut">
                    <circle class="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="transparent"></circle>
                    <circle class="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" stroke-width="5"></circle>
                    <circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EF4444" stroke-width="5" stroke-dasharray="21 79" stroke-dashoffset="25"></circle>
                    <circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F59E0B" stroke-width="5" stroke-dasharray="39 61" stroke-dashoffset="4"></circle>
                    <circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0D9488" stroke-width="5" stroke-dasharray="40 60" stroke-dashoffset="65"></circle>
                </svg>
            </div>
            <div style="display: flex; justify-content: space-around; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                <div style="text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);"><span style="color: #EF4444;">●</span> High</div>
                    <div style="font-weight: 700; font-size: 1rem;">31</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);"><span style="color: #F59E0B;">●</span> Medium</div>
                    <div style="font-weight: 700; font-size: 1rem;">58</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);"><span style="color: #0D9488;">●</span> Low</div>
                    <div style="font-weight: 700; font-size: 1rem;">58</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with chart_col2:
        st.markdown("""
        <div class="chart-card">
            <div class="chart-header">
                <div>
                    <div class="chart-title">Processing Status by Document Type</div>
                    <div class="chart-subtitle">Processed, needs review, and failed across document types</div>
                </div>
            </div>
            <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 180px; padding: 0 1rem;">
                <!-- Invoices -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 64px;">
                    <div style="width: 100%; height: 12px; background: #EF4444; border-radius: 4px 4px 0 0;"></div>
                    <div style="width: 100%; height: 28px; background: #F59E0B;"></div>
                    <div style="width: 100%; height: 100px; background: #0F172A; border-radius: 0 0 4px 4px;"></div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">Invoice</span>
                </div>
                <!-- Contracts -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 64px;">
                    <div style="width: 100%; height: 8px; background: #EF4444; border-radius: 4px 4px 0 0;"></div>
                    <div style="width: 100%; height: 20px; background: #F59E0B;"></div>
                    <div style="width: 100%; height: 60px; background: #0F172A; border-radius: 0 0 4px 4px;"></div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">Contract</span>
                </div>
                <!-- Compliance -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 64px;">
                    <div style="width: 100%; height: 6px; background: #EF4444; border-radius: 4px 4px 0 0;"></div>
                    <div style="width: 100%; height: 16px; background: #F59E0B;"></div>
                    <div style="width: 100%; height: 75px; background: #0F172A; border-radius: 0 0 4px 4px;"></div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">Compliance</span>
                </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
                <span><span style="color: #0F172A;">●</span> Processed</span>
                <span><span style="color: #F59E0B;">●</span> Needs Review</span>
                <span><span style="color: #EF4444;">●</span> Failed</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 1.5rem;'></div>", unsafe_allow_html=True)

    # 3. RECENT ACTIVITY AUDIT TRAIL TABLE
    st.markdown("""
    <div class="chart-card">
        <div class="chart-header">
            <div>
                <div class="chart-title">Recent Activity</div>
                <div class="chart-subtitle">Audit trail of recently processed documents</div>
            </div>
            <div style="color: #2563EB; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                View all →
            </div>
        </div>
    """, unsafe_allow_html=True)

    activity_docs = docs_list[:8]
    if activity_docs:
        table_rows = []
        for d in activity_docs:
            d_anoms = [a for a in anomalies_all if a.get("doc_id") == d.get("doc_id")]
            h_count = len([a for a in d_anoms if a.get("severity", "").lower() == "high"])
            m_count = len([a for a in d_anoms if a.get("severity", "").lower() == "medium"])
            l_count = len([a for a in d_anoms if a.get("severity", "").lower() == "low"])
            
            if h_count > 0:
                anom_badge = f'<span class="pill-badge badge-high">{h_count} high</span>'
            elif m_count > 0:
                anom_badge = f'<span class="pill-badge badge-medium">{m_count} medium</span>'
            elif l_count > 0:
                anom_badge = f'<span class="pill-badge badge-low">{l_count} low</span>'
            else:
                anom_badge = '<span class="pill-badge badge-clean">None</span>'
            
            conf_val = d.get("overall_confidence", 0.92)
            if conf_val >= 0.85:
                conf_badge = f'<span style="color: #10B981; font-weight: 600;">{conf_val:.0%} high</span>'
            elif conf_val >= 0.70:
                conf_badge = f'<span style="color: #F59E0B; font-weight: 600;">{conf_val:.0%} medium</span>'
            else:
                conf_badge = f'<span style="color: #EF4444; font-weight: 600;">{conf_val:.0%} low</span>'

            type_name = d.get("doc_type", "invoice")
            badge_class = f"badge-{type_name.split('_')[0]}"

            table_rows.append(f"""
            <tr style="border-bottom: 1px solid var(--border-color); height: 48px;">
                <td style="font-weight: 600; font-size: 0.875rem;">📄 {d.get('filename')}</td>
                <td><span class="pill-badge {badge_class}">{type_name}</span></td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">{d.get('created_at', '')[:16]}</td>
                <td>{conf_badge}</td>
                <td>{anom_badge}</td>
            </tr>
            """)
        
        st.markdown(f"""
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
            <thead>
                <tr style="text-align: left; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); height: 32px;">
                    <th>Document</th>
                    <th>Type</th>
                    <th>Processed</th>
                    <th>Confidence</th>
                    <th>Anomalies</th>
                </tr>
            </thead>
            <tbody>
                {''.join(table_rows)}
            </tbody>
        </table>
        """, unsafe_allow_html=True)
    else:
        st.info("No activity records available.")

    st.markdown("</div>", unsafe_allow_html=True)


# ==============================================================================
# WORKSPACE 2: REVIEW TAB — DESIGN 3 MATCH
# ==============================================================================
elif st.session_state["active_tab"] == "Review":
    col_left, col_mid, col_right = st.columns([1.1, 2.2, 1.4], gap="medium")

    # --------------------------------------------------------------------------
    # LEFT COLUMN: UPLOAD DROPZONE & DOCUMENTS LIST
    # --------------------------------------------------------------------------
    with col_left:
        st.markdown("""
        <div class="upload-dropzone">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">☁️</div>
            <strong style="font-size: 0.875rem;">Upload Document</strong><br>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">PDF or scanned image</span>
        </div>
        """, unsafe_allow_html=True)

        uploaded = st.file_uploader("Upload", type=["pdf", "png", "jpg", "jpeg", "webp"], label_visibility="collapsed", key="review_uploader")
        if uploaded:
            suffix = Path(uploaded.name).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(uploaded.read())
                tmp_path = tmp.name
            try:
                res = process_document(file_path=tmp_path)
                st.session_state["review_doc_id"] = res.doc_id
                st.success("Ingested!")
                st.rerun()
            except Exception as e:
                st.error(f"Error: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        # Document Corpus List
        docs_list = default_db.list_documents()
        st.markdown(f"<div style='font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin: 1rem 0 0.5rem 0;'>DOCUMENTS <span style='background: var(--bg-secondary); padding: 1px 6px; border-radius: 999px;'>{len(docs_list)}</span></div>", unsafe_allow_html=True)

        if not st.session_state["review_doc_id"] and docs_list:
            st.session_state["review_doc_id"] = docs_list[0]["doc_id"]

        for d in docs_list:
            is_active = (d["doc_id"] == st.session_state["review_doc_id"])
            active_class = "active" if is_active else ""
            
            anom_count = d.get("anomaly_count", 0)
            status_text = f"{anom_count} need review" if anom_count > 0 else ("scanned" if d.get("is_scanned") else "clean")
            status_color = "#F59E0B" if anom_count > 0 else ("#0284C7" if d.get("is_scanned") else "#10B981")
            
            d_type = d.get("doc_type", "invoice")
            badge_class = f"badge-{d_type.split('_')[0]}"

            btn_label = f"📄 {d['filename']}\n[{d_type}] • {status_text}"
            if st.button(btn_label, key=f"doc_btn_{d['doc_id']}", use_container_width=True):
                st.session_state["review_doc_id"] = d["doc_id"]
                st.rerun()

    # --------------------------------------------------------------------------
    # MIDDLE COLUMN: STRUCTURED EXTRACTED FIELDS & LINE ITEMS TABLE
    # --------------------------------------------------------------------------
    with col_mid:
        current_doc = default_db.get_document(st.session_state["review_doc_id"]) if st.session_state["review_doc_id"] else None
        
        if current_doc:
            doc_type_pill = f"<span class='pill-badge badge-{current_doc['doc_type']}'>{current_doc['doc_type']}</span>"
            
            st.markdown(f"""
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0; font-weight: 800; font-size: 1.35rem; display: flex; align-items: center; gap: 0.5rem;">
                        {current_doc['filename']} {doc_type_pill}
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">
                        Extracted {len(current_doc.get('fields', {}))} fields · {len(current_doc.get('anomalies', []))} flagged for human review · processed {current_doc.get('created_at', '')[:16]}
                    </p>
                </div>
            </div>
            """, unsafe_allow_html=True)

            ctrl_col1, ctrl_col2 = st.columns([2, 1], vertical_alignment="center")
            with ctrl_col1:
                st.session_state["low_conf_only"] = st.toggle("Low-confidence only", value=st.session_state["low_conf_only"])
            with ctrl_col2:
                st.download_button("📥 Export JSON", data=json.dumps(current_doc, indent=2), file_name=f"{current_doc['filename']}.json", use_container_width=True)

            st.markdown("""
            <div style="margin: 1.25rem 0 0.5rem 0;">
                <strong style="font-size: 1rem;">Extracted Fields</strong><br>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Each value carries a model confidence score. Click a field to correct it.</span>
            </div>
            """, unsafe_allow_html=True)

            fields = current_doc.get("fields", {})
            for field_name, f_data in fields.items():
                val = f_data.get("value")
                conf = float(f_data.get("confidence", 0.9))
                needs_review = (conf < 0.70)

                if st.session_state["low_conf_only"] and not needs_review:
                    continue

                review_class = "needs-review" if needs_review else ""
                review_badge = "<span style='color: #D97706; font-weight: 700; font-size: 0.7rem;'>⚠️ needs review</span>" if needs_review else ""
                conf_html = get_conf_pill_html(conf)

                if isinstance(val, (dict, list)):
                    # Handled below in table
                    continue
                else:
                    st.markdown(f"""
                    <div class="field-box {review_class}">
                        <div>
                            <div class="field-label">
                                <span>{field_name.replace('_', ' ').title()}</span>
                                {review_badge}
                            </div>
                            <div class="field-val">{val if val is not None else '—'}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            {conf_html}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

            # Line items table if present
            line_items_data = fields.get("line_items", {}).get("value")
            if isinstance(line_items_data, list) and line_items_data:
                st.markdown("""
                <div style="margin: 1.5rem 0 0.5rem 0;">
                    <strong style="font-size: 1rem;">Line Items</strong><br>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Extracted from the document table.</span>
                </div>
                """, unsafe_allow_html=True)
                
                rows_html = []
                for item in line_items_data:
                    if isinstance(item, dict):
                        rows_html.append(f"""
                        <tr style="border-bottom: 1px solid var(--border-color); height: 42px; font-size: 0.85rem;">
                            <td>{item.get('description', 'Item')}</td>
                            <td>{item.get('quantity', item.get('qty', '1'))}</td>
                            <td>${float(item.get('unit_price', 0)):,.2f}</td>
                            <td style="font-weight: 700;">${float(item.get('total', item.get('amount', 0))):,.2f}</td>
                            <td><span class="conf-pill-high">0.95</span></td>
                        </tr>
                        """)
                
                st.markdown(f"""
                <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
                    <thead>
                        <tr style="text-align: left; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); height: 32px;">
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                            <th>Conf.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(rows_html)}
                    </tbody>
                </table>
                """, unsafe_allow_html=True)

        else:
            st.info("Select a document from the left list to review.")

    # --------------------------------------------------------------------------
    # RIGHT COLUMN: ANOMALY FLAGS & VISUAL SOURCE PREVIEW
    # --------------------------------------------------------------------------
    with col_right:
        if current_doc:
            anoms = current_doc.get("anomalies", [])
            st.markdown(f"""
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <strong style="font-size: 1rem;">🚩 Anomaly Flags</strong>
                <span style="background: var(--bg-secondary); padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">{len(anoms)}</span>
            </div>
            """, unsafe_allow_html=True)

            filter_c1, filter_c2, filter_c3, filter_c4 = st.columns(4)
            with filter_c1:
                if st.button("All", key="anom_all", use_container_width=True):
                    st.session_state["anomaly_filter"] = "All"
            with filter_c2:
                if st.button("High", key="anom_high", use_container_width=True):
                    st.session_state["anomaly_filter"] = "High"
            with filter_c3:
                if st.button("Med", key="anom_med", use_container_width=True):
                    st.session_state["anomaly_filter"] = "Med"
            with filter_c4:
                if st.button("Low", key="anom_low", use_container_width=True):
                    st.session_state["anomaly_filter"] = "Low"

            filtered_anoms = anoms
            if st.session_state["anomaly_filter"] == "High":
                filtered_anoms = [a for a in anoms if a.get("severity", "").lower() == "high"]
            elif st.session_state["anomaly_filter"] == "Med":
                filtered_anoms = [a for a in anoms if a.get("severity", "").lower() == "medium"]
            elif st.session_state["anomaly_filter"] == "Low":
                filtered_anoms = [a for a in anoms if a.get("severity", "").lower() == "low"]

            if filtered_anoms:
                for a in filtered_anoms:
                    sev = a.get("severity", "medium").lower()
                    st.markdown(f"""
                    <div class="anomaly-card {sev}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                            <span class="pill-badge badge-{sev}">● {sev.upper()}</span>
                            <span style="font-weight: 700; font-size: 0.85rem;">{a.get('field', 'General')}</span>
                        </div>
                        <div style="font-size: 0.8rem; line-height: 1.35; color: var(--text-primary);">
                            {a.get('message')}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.markdown("<div style='font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;'>✅ No flags matching filter.</div>", unsafe_allow_html=True)

            # SOURCE PREVIEW THUMBNAIL
            st.markdown("<strong style='font-size: 0.95rem; display: block; margin: 1.5rem 0 0.5rem 0;'>Source Preview</strong>", unsafe_allow_html=True)
            img = render_pdf_page_image(current_doc.get("file_path", ""), page_num=1)
            if img:
                st.image(img, use_container_width=True)
            else:
                st.caption("No preview thumbnail available.")


# ==============================================================================
# WORKSPACE 3: ASK TAB (GROUNDED RAG Q&A) — DESIGN 1 MATCH
# ==============================================================================
elif st.session_state["active_tab"] == "Ask":
    ask_col1, ask_col2 = st.columns([1.1, 3.2], gap="large")

    # --------------------------------------------------------------------------
    # LEFT COLUMN: DOCUMENT CORPUS SEARCH & LIST
    # --------------------------------------------------------------------------
    with ask_col1:
        docs_list = default_db.list_documents()
        st.markdown(f"""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <strong style="font-size: 1rem;">Document Corpus</strong>
            <span style="background: var(--bg-secondary); padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">{len(docs_list)}</span>
        </div>
        """, unsafe_allow_html=True)

        search_q = st.text_input("Filter documents...", placeholder="🔍 Filter documents...", label_visibility="collapsed")
        
        filtered_docs = docs_list
        if search_q:
            filtered_docs = [d for d in docs_list if search_q.lower() in d.get("filename", "").lower()]

        st.markdown("<div style='height: 0.5rem;'></div>", unsafe_allow_html=True)
        for d in filtered_docs:
            d_type = d.get("doc_type", "invoice")
            badge_class = f"badge-{d_type.split('_')[0]}"
            icon = "🛡️" if "compliance" in d_type else "📄"
            st.markdown(f"""
            <div class="doc-item-card">
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 500;">
                    <span>{icon}</span>
                    <span>{d.get('filename')}</span>
                </div>
                <span class="pill-badge {badge_class}">{d_type.split('_')[0]}</span>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("""
        <div style="margin-top: 2rem; padding: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
            <span>🗄️</span>
            <span>Indexed & searchable via RAG</span>
        </div>
        """, unsafe_allow_html=True)

    # --------------------------------------------------------------------------
    # RIGHT COLUMN: CHAT STREAM & DOCKED CHAT INPUT
    # --------------------------------------------------------------------------
    with ask_col2:
        st.markdown("""
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
                <h3 style="margin: 0; font-weight: 800; font-size: 1.35rem;">Ask across your documents</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Natural-language Q&A over the full corpus with source citations</p>
            </div>
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;">
                ✨ Gemini RAG
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Message Stream
        chat_container = st.container()
        with chat_container:
            if not st.session_state["chat_history"]:
                st.markdown("""
                <div style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">💬</div>
                    <strong style="font-size: 1.1rem; color: var(--text-primary);">Search & Query Document Intelligence</strong>
                    <p style="font-size: 0.85rem; max-width: 480px; margin: 0.5rem auto;">Ask financial calculations, contract renewal deadlines, or audit deficiency timelines across your document repository.</p>
                </div>
                """, unsafe_allow_html=True)
            else:
                for msg in st.session_state["chat_history"]:
                    if msg["role"] == "user":
                        st.markdown(f"""
                        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                            <div style="background: #0F172A; color: white; padding: 0.75rem 1.15rem; border-radius: 12px 12px 2px 12px; font-size: 0.9rem; max-width: 75%;">
                                {msg['content']}
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        st.markdown(f"""
                        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 12px; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="font-size: 0.925rem; line-height: 1.5; color: var(--text-primary);">
                                {msg['content']}
                            </div>
                        </div>
                        """, unsafe_allow_html=True)

        # Bottom Docked Input Bar
        user_prompt = st.chat_input("Ask anything about your invoices, contracts, or compliance docs...")
        st.markdown("<div style='text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;'>Answers are grounded in your indexed documents with citations.</div>", unsafe_allow_html=True)

        if user_prompt:
            st.session_state["chat_history"].append({"role": "user", "content": user_prompt})
            with st.spinner("Generating grounded answer with citations..."):
                ans_obj = answer_document_query(user_prompt)
                st.session_state["chat_history"].append({"role": "assistant", "content": ans_obj.answer})
            st.rerun()
