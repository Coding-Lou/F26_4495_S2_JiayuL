# CSIS 4495 Project Proposal

## Agentic Cloud-Native Invoice Processing Platform

**Student:** Jiayu Lou  \
**Student ID:** 300398003  \
**Course:** CSIS 4495  \
**Section:** Section 2  \
**Instructor:** Padmapriya Arasanipalai Kandhadai  \
**Team Lead:** Jiayu Lou — Individual Project  \
**Date:** September 2026

---

## 1. Introduction

During my previous work experience, I helped automate several accounting workflows, including invoice processing and financial reporting. Most of the tools were built as Python desktop applications.

Although the automation reduced manual work, I found that a desktop-based solution has some limitations. It is harder to deploy, maintain, scale, and integrate with other systems.

For this project, I want to redesign part of the invoice-processing workflow as a **cloud-native, AI-agent-based application**.

The main goal is to build a system that can receive an invoice, extract important information, validate the extracted data, and decide whether the invoice can be processed automatically or requires human review.

The system should be able to identify information such as:

* Vendor name
* Invoice number
* Invoice date
* Purchase order number
* Line item / Item number
* Item description
* Item quantity
* Item unit price
* Item total
* Subtotal
* Tax
* Total amount

Instead of treating OCR or Amazon Textract as the complete solution, document extraction will be one of the tools available to an **AI agent**.

The agent will be responsible for deciding which tools to call and what action should be taken based on the invoice data and validation results.

The project will focus on **intelligent invoice processing and validation**, rather than building a complete accounting or ERP system.

---

## 2. Problem

Invoices normally arrive as PDF files.

Accounting staff need to manually open the document, identify important information, verify that the information is correct, and enter it into another system.

This process has several problems:

* It is repetitive.
* Manual entry can introduce errors.
* Invoice formats are different between vendors.
* OCR results may be incomplete or incorrect.
* High OCR confidence does not always mean that the extracted business data is valid.
* Some extracted values may be ambiguous even when the OCR result is technically correct.
* Traditional desktop automation is difficult to scale and maintain.

A simple OCR system can extract text, but it does not necessarily understand whether the extracted result is logically correct or how the data should be interpreted.

For example:

```text
Subtotal: $1,000
GST: $70
PST: $50
Total: $1,170
```

Even if an OCR service returns high confidence for these fields, the values are inconsistent because:

```text
1000 + 70 + 50 != 1170
```

Another challenge is that invoice date formats are not consistent between vendors.

For example:

```text
08/07/2026
```

This could mean:

```text
August 7, 2026
```

or:

```text
July 8, 2026
```

depending on whether the vendor uses the `MM/DD/YYYY` or `DD/MM/YYYY` format.

The OCR result may therefore be completely accurate while the system still interprets the date incorrectly.

To handle these cases, the system needs more than text extraction. It also needs contextual validation and decision-making, such as checking vendor information, known date formats, invoice values, and other available business data before accepting the result.


---

## 3. Proposed Solution

The proposed solution is an **AI-agent-based invoice-processing platform**.

The basic workflow will be:

```text
Invoice PDF
        ↓
Upload through Web/API
        ↓
Store Document
        ↓
Invoice Processing Agent
        ↓
Extract Invoice Information
        ↓
Validate Data
        ↓
Agent Decision
      ↙       ↘
Auto Accept   Human Review
        ↓
Store Result
```

The AI agent will have access to tools such as:

```text
extract_invoice()
lookup_vendor()
lookup_purchase_order()
validate_amounts()
check_duplicate()
save_invoice()
request_human_review()
```

For example, if the extracted total amount does not match the subtotal and tax, the agent may call the validation tool, retry extraction if necessary, and then decide to send the invoice for human review.

The backend will mainly be developed using **Java and Spring Boot**.

The first version will be a private deployment for one organization rather than a multi-tenant SaaS product.

---

## 4. System Architecture

The planned architecture is:

```text
                    Invoice
                       ↓
                Web / REST API
                       ↓
                 Spring Boot
                       ↓
                Invoice Agent
                       ↓
        ┌──────────────┼───────────────┐
        ↓              ↓               ↓
   Document        Date / Field     Line Item
   Extraction      Normalization     Parsing
   (Textract)          Tool            Tool
        ↓              ↓               ↓
        └──────────────┼───────────────┘
                       ↓
                Validation Tools
                       ↓
          ┌────────────┼────────────┐
          ↓            ↓            ↓
     Amount / Tax   Duplicate    Consistency
      Validation      Check        Check
          └────────────┼────────────┘
                       ↓
                  Agent Decision
                  ↙            ↘
             Auto Accept    Human Review
                  ↓
              PostgreSQL
```

The AI agent will act as the orchestration layer rather than directly implementing every function.

The actual business operations will be implemented as tools that the agent can call.

---

## 5. Main Technologies

The current planned technology stack is:

| Area               | Technology                      |
| ------------------ | ------------------------------- |
| Backend            | Java 17, Spring Boot            |
| AI Integration     | Spring AI                       |
| Agent Tools        | MCP / Spring-based tools        |
| Frontend           | React / TypeScript (Optional)   |
| Database           | PostgreSQL                      |
| Document Storage   | Amazon S3                       |
| Invoice Extraction | Tesseract OCR / Amazon Textract |
| Messaging          | Amazon SQS                      |
| Container          | Docker                          |
| Deployment         | Kubernetes                      |
| Infrastructure     | Terraform                       |
| CI/CD              | GitHub Actions                  |
| Cloud Platform     | AWS                             |

Some technologies may be adjusted during implementation depending on the complexity and project timeline.

---

## 6. Research and Evaluation

This project will not only build the application but also evaluate whether an agentic workflow provides practical benefits compared with a traditional fixed workflow.

I plan to prepare a small dataset of invoices with different layouts and compare the processing results with manually labelled correct values.

The main fields I will evaluate include:

* Invoice number
* Vendor name
* Invoice date
* PO number
* Subtotal
* Tax
* Total amount

I plan to compare three approaches.

### Approach 1 — Traditional OCR

```text
Invoice
→ Tesseract OCR
→ Text
→ Fixed Rules
→ Invoice Data
```

### Approach 2 — Managed Document Processing

```text
Invoice
→ Amazon Textract
→ Structured Data
→ Fixed Validation Rules
→ Result
```

### Approach 3 — Agentic Processing

```text
Invoice
→ AI Agent
→ Document Extraction
→ Select Validation Tools
→ Retry / Verify if Needed
→ Auto Accept or Human Review
```

The evaluation will mainly consider:

* Extraction accuracy
* Final decision accuracy
* False acceptance rate
* Automation rate
* Manual review rate
* Processing time
* Number of agent tool calls
* API / LLM cost
* Reliability

One important measurement will be the **false acceptance rate**.

This represents cases where the system automatically accepts an invoice even though the extracted data is incorrect.

Another measurement will be the **automation rate**, which represents how many invoices can be processed without human review.

The research will evaluate whether the agentic approach can increase automation without significantly increasing incorrect automatic decisions.

---

## 7. Human-in-the-Loop Validation

The system will not assume that every AI-generated result is correct.

Invoices with uncertain or inconsistent results will be sent for human review.

For example:

```text
Invoice A

Extraction Confidence: High
PO exists: Yes
Vendor exists: Yes
Subtotal + Tax = Total: Yes

→ AUTO ACCEPT
```

Compared with:

```text
Invoice B

Extraction Confidence: High
PO exists: Yes
Vendor exists: Yes
Subtotal + Tax = Total: No

→ HUMAN REVIEW
```

This allows the system to combine AI automation with deterministic business validation.

The goal is not to eliminate human review completely, but to reduce unnecessary manual work while maintaining reliable results.

---

## 8. Project Scope

### In Scope

The project will include:

* Invoice upload
* REST API
* User authentication
* AI agent orchestration
* Agent tool calling
* Invoice information extraction
* Business validation
* Human-in-the-loop review
* PostgreSQL database
* Asynchronous processing
* Basic review interface
* Docker
* Kubernetes
* Terraform
* CI/CD
* Testing and evaluation

### Out of Scope

To keep the project manageable, I will not implement:

* Full accounts-payable workflow
* Invoice payment
* Full three-way matching
* Automatic ERP posting
* Multi-tenant SaaS architecture
* Custom machine-learning model training
* Complex multi-agent architecture

The project will initially use a **single agent with multiple tools** instead of multiple specialized agents.

The main goal is to increase the technical and research depth of the system rather than adding many business features.

---

## 9. Expected Result

At the end of the project, I expect to have a working prototype where a user can submit an invoice and the AI agent can process it using different tools.

For example:

```json
{
  "vendor": "ABC Supplier",
  "invoiceNumber": "INV-10021",
  "invoiceDate": "2026-09-10",
  "poNumber": "PO-25009",
  "subtotal": 1000.00,
  "tax": 120.00,
  "total": 1120.00,
  "status": "AUTO_ACCEPTED"
}
```

If the system identifies an inconsistency, the result may instead be:

```json
{
  "invoiceNumber": "INV-10021",
  "status": "REVIEW_REQUIRED",
  "reason": "Invoice total does not match subtotal and tax"
}
```

The application should also demonstrate:

* AI agent tool calling
* Cloud deployment
* Asynchronous processing
* Automated testing
* Infrastructure as Code
* CI/CD
* Basic monitoring and error handling

The final report will compare the traditional and agentic approaches and evaluate whether the AI agent provides measurable benefits.

---

## 10. Project Timeline

| Phase       | Main Work                            |
| ----------- | ------------------------------------ |
| Weeks 1–2   | Research, requirements, architecture |
| Weeks 3–5   | Spring Boot backend and database     |
| Weeks 6–7   | Invoice extraction and validation    |
| Weeks 8–9   | AI agent and tool integration        |
| Weeks 10–11 | Frontend, Docker and AWS deployment  |
| Weeks 12–13 | Kubernetes and Terraform             |
| Week 14     | CI/CD and testing                    |
| Week 15     | Research evaluation                  |
| Week 16     | Final report and presentation        |

The first priority will be to complete the invoice-processing workflow and validation tools.

The AI agent will then be added as an orchestration layer after the core tools are working.

Cloud infrastructure and advanced features will be added after the core workflow is stable.

---

## 11. Optional Extension — Email Integration

If the core project is completed early, I would like to integrate the system with email.

The final workflow could be:

```text
Sender
   ↓
Send Invoice Email
   ↓
Gmail
   ↓
New Email Event
   ↓
Invoice Processing Platform
   ↓
Invoice Agent
   ↓
Extract + Validate + Decide
   ↓
Database / Human Review
```

For example, during the final demonstration, an invoice PDF could be sent to a dedicated outlook inbox.

The application could detect the new email and automatically trigger the invoice-processing workflow.

A possible architecture would be:

```text
Outlook
   ↓
Graph API / Pub/Sub
   ↓
Spring Boot
   ↓
Invoice Agent
   ↓
Agent Tools
```

MCP may also be used to allow the AI agent to interact with external systems through standardized tools.

However, outlook and MCP integration will remain an **optional extension** so that they do not block completion of the main research project.

---

## 12. Expected Learning Outcomes

Through this project, I want to improve my understanding of:

* Java and Spring Boot backend development
* AI agents and tool calling
* Model Context Protocol (MCP)
* Human-in-the-loop AI systems
* Asynchronous and event-driven architecture
* Cloud-native application design
* AWS services
* Docker and Kubernetes
* Infrastructure as Code
* CI/CD
* Automated testing
* System reliability and observability
* Evaluation of AI-assisted systems

The project will also allow me to apply these technologies to a business problem that I have previously encountered in a real working environment.


## 13. Work Date / Hours Log

**Student Name:** Jiayu Lou

The work log will be updated regularly throughout the project. Each entry will record the actual work completed on that day, together with the time spent and the related project output.

| Date | Number of Hours | Description of Work Done |
|---|---:|---|
| Sep. 22, 2026 | 1 | Defined the project as an agentic cloud-native invoice-processing platform and reviewed the initial project scope. |
| Sep. 22, 2026 | 3 | Drafted the project proposal, including problem definition, proposed solution, technology stack, research evaluation, project scope, and optional Outlook integration. |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

