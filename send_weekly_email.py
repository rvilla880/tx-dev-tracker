#!/usr/bin/env python3
"""
Weekly email digest sender for TX Dev Tracker.
Called by GitHub Actions after each scrape.
Requires environment variables:
  ANTHROPIC_API_KEY  - for generating the summary
  EMAIL_TO           - recipient email
  EMAIL_FROM         - Gmail sender address
  EMAIL_PASSWORD     - Gmail App Password (16-char)
"""

import json
import os
import smtplib
import sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import anthropic


def load_filings(path: str = "public/filings.json") -> dict:
    with open(path) as f:
        return json.load(f)


def generate_summary(filings: list) -> str:
    """Use Claude to write the weekly email body."""
    client = anthropic.Anthropic()

    # Group by hub for the summary
    by_hub = {}
    for f in filings:
        by_hub.setdefault(f["hub"], []).append(f)

    hub_names = {
        "fort_worth": "Fort Worth / DFW",
        "georgetown": "Georgetown / Austin",
        "san_antonio": "San Antonio"
    }

    list_str = ""
    for hub_id, hub_filings in by_hub.items():
        list_str += f"\n{hub_names.get(hub_id, hub_id)}:\n"
        for f in hub_filings[:8]:
            list_str += f"  • {f['project']} ({f['county']} Co.) | {f['developer']} | {f.get('units',0)} units | {f['status']}\n"

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""You are a real estate market intelligence analyst covering Texas residential development.

This week's new residential filings from county clerk records across Fort Worth, Georgetown/Austin, and San Antonio:
{list_str}

Write a weekly email summary (plain text, no markdown, under 350 words) covering:
1. Subject line suggestion (start with "SUBJECT: ")
2. Overall market pulse this week
3. Three most notable filings and why they matter
4. Key trends across the three regions  
5. What to watch next week

Professional tone, data-driven, actionable for a real estate investor/developer."""
        }]
    )
    return message.content[0].text


def build_html_email(summary: str, filings: list, generated_at: str) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    # Extract subject line if Claude provided one
    lines = summary.strip().split("\n")
    subject = f"TX Dev Tracker — Weekly Report {datetime.now().strftime('%b %d, %Y')}"
    body_lines = lines

    for i, line in enumerate(lines):
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
            body_lines = lines[i+1:]
            break

    body_text = "\n".join(body_lines).strip()

    # Build summary stats
    total_units = sum(f.get("units", 0) for f in filings)
    total_acres = sum(f.get("acres", 0) for f in filings)
    approved = len([f for f in filings if f.get("status") == "approved"])

    hub_counts = {}
    for f in filings:
        hub_counts[f["hub"]] = hub_counts.get(f["hub"], 0) + 1

    hub_names = {
        "fort_worth": "Fort Worth / DFW",
        "georgetown": "Georgetown / Austin",
        "san_antonio": "San Antonio"
    }

    stats_html = "".join([
        f'<td style="padding:12px 16px;text-align:center;border-right:1px solid #e8e6e0"><div style="font-size:22px;font-weight:700;color:#1a6bb5">{len(filings)}</div><div style="font-size:11px;color:#888;margin-top:2px">New Filings</div></td>',
        f'<td style="padding:12px 16px;text-align:center;border-right:1px solid #e8e6e0"><div style="font-size:22px;font-weight:700;color:#1a6bb5">{total_units:,}</div><div style="font-size:11px;color:#888;margin-top:2px">Total Units</div></td>',
        f'<td style="padding:12px 16px;text-align:center;border-right:1px solid #e8e6e0"><div style="font-size:22px;font-weight:700;color:#1a6bb5">{total_acres:,.0f}</div><div style="font-size:11px;color:#888;margin-top:2px">Acres</div></td>',
        f'<td style="padding:12px 16px;text-align:center"><div style="font-size:22px;font-weight:700;color:#16a34a">{approved}</div><div style="font-size:11px;color:#888;margin-top:2px">Approved</div></td>',
    ])

    hub_pills = "".join([
        f'<span style="display:inline-block;margin:3px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#f0ede8;color:#555">{hub_names.get(h,h)}: {c} filing{"s" if c!=1 else ""}</span>'
        for h, c in hub_counts.items()
    ])

    # Top 5 filings table
    top_filings = sorted(filings, key=lambda f: f.get("units", 0), reverse=True)[:5]
    rows_html = "".join([
        f"""<tr style="border-bottom:1px solid #f0ede8">
          <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#1a1a18">{f['project']}</td>
          <td style="padding:10px 12px;font-size:12px;color:#555">{f['county']} Co.</td>
          <td style="padding:10px 12px;font-size:12px;color:#555">{f.get('units',0)}</td>
          <td style="padding:10px 12px;font-size:12px">
            <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;
              background:{'#dcfce7' if f['status']=='approved' else '#fef3c7' if f['status']=='pending' else '#dbeafe'};
              color:{'#16a34a' if f['status']=='approved' else '#d97706' if f['status']=='pending' else '#2563eb'}">
              {f['status'].replace('_',' ').title()}
            </span>
          </td>
        </tr>"""
        for f in top_filings
    ])

    body_html = body_text.replace("\n\n", "</p><p>").replace("\n", "<br>")

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0">

    <!-- Header -->
    <div style="background:#1a1a18;padding:24px 28px">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px">🏗️ TX Dev Tracker</div>
      <div style="font-size:12px;color:#888;margin-top:4px">Weekly Residential Development Report · {datetime.now().strftime('%B %d, %Y')}</div>
    </div>

    <!-- Stats bar -->
    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #e8e6e0">
      <tr>{stats_html}</tr>
    </table>

    <!-- Hub breakdown -->
    <div style="padding:14px 20px;background:#f8f7f4;border-bottom:1px solid #e8e6e0">
      {hub_pills}
    </div>

    <!-- AI Summary -->
    <div style="padding:24px 28px">
      <div style="font-size:13px;font-weight:700;color:#1a6bb5;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
        ✦ AI Market Intelligence
      </div>
      <div style="font-size:13px;color:#444;line-height:1.8">
        <p>{body_html}</p>
      </div>
    </div>

    <!-- Top filings table -->
    <div style="padding:0 28px 24px">
      <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
        Top Filings This Week
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f8f7f4;border-bottom:1px solid #e8e6e0">
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#888;font-weight:700;text-transform:uppercase">Project</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#888;font-weight:700;text-transform:uppercase">County</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#888;font-weight:700;text-transform:uppercase">Units</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;color:#888;font-weight:700;text-transform:uppercase">Status</th>
          </tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f8f7f4;padding:16px 28px;border-top:1px solid #e8e6e0">
      <div style="font-size:11px;color:#aaa;line-height:1.7">
        Data sourced from Texas county commissioners court agendas and public filing records.<br>
        Generated {generated_at[:10]} · TX Dev Tracker via GitHub Actions
      </div>
    </div>
  </div>
</body>
</html>"""

    return subject, html


def send_email(subject: str, html_body: str, to: str, from_addr: str, password: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"TX Dev Tracker <{from_addr}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_addr, password)
        server.sendmail(from_addr, to, msg.as_string())


def main():
    # Check required env vars
    required = ["ANTHROPIC_API_KEY", "EMAIL_TO", "EMAIL_FROM", "EMAIL_PASSWORD"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"⚠️  Missing env vars: {missing} — skipping email")
        sys.exit(0)

    print("Loading filings…")
    data = load_filings()
    filings = data.get("filings", [])

    if not filings:
        print("No filings found — skipping email")
        sys.exit(0)

    print(f"Generating AI summary for {len(filings)} filings…")
    summary = generate_summary(filings)

    print("Building HTML email…")
    subject, html = build_html_email(summary, filings, data.get("generated_at", ""))

    print(f"Sending to {os.environ['EMAIL_TO']}…")
    send_email(
        subject=subject,
        html_body=html,
        to=os.environ["EMAIL_TO"],
        from_addr=os.environ["EMAIL_FROM"],
        password=os.environ["EMAIL_PASSWORD"]
    )

    print(f"✅ Weekly email sent: {subject}")


if __name__ == "__main__":
    main()
