# CSIS 4495 Project Proposal

## Cloud-Native Distributed Invoice Processing Platform

**Student:** Jiayu Lou  \
**Student ID:** 300398003  \
**Course:** CSIS 4495  \
**Section:** Section 2  \
**Instructor:** Padmapriya Arasanipalai Kandhadai  \
**Team Lead:** Jiayu Lou — Individual Project  \
**Date:** September 2026

---

## 1. Introduction

During my current internship experience, I helped automate several accounting workflows, including invoice processing and financial reporting.

Although the automation reduced manual work, I found that a desktop-based solution has some limitations. It is harder to deploy, maintain, scale, recover from failures, and integrate with other systems.

The main goal is to build a system that can receive an invoice, process it asynchronously, extract important information, validate the extracted data, and decide whether the result can be accepted automatically or requires human review.

The system should be able to identify information such as:

* Vendor name
* Invoice number
* Invoice date
* Due date
* Purchase order number
* Line item / item number
* Item description
* Item quantity
* Unit of measure (UOM)
* Item unit price
* Item total / extended amount
* Subtotal
* Tax type and tax amount
* Total amount

The project will focus on two areas:

1. **Distributed invoice processing** — asynchronous messaging, worker services, retries, idempotency, failure recovery, and horizontal scaling.
2. **Agentic validation** — using an AI agent and validation tools to interpret ambiguous or inconsistent invoice data and determine when human review is required.

The project will not attempt to build a complete accounting or ERP system.

---

## 2. Problem

Invoices normally arrive as PDF files and must be converted into structured data before they can be used by accounting systems.

Accounting staff often need to manually open the document, identify important information, verify that the information is correct, and enter it into another system.

This process has several problems:

* It is repetitive.
* Manual entry can introduce errors.
* Invoice formats are different between vendors.
* OCR results may be incomplete or incorrect.
* High OCR confidence does not always mean that the extracted business data is valid.
* Some extracted values may be ambiguous even when the OCR result is technically correct.
* Long-running document processing can make synchronous APIs slow and difficult to scale.
* Temporary failures can cause invoice-processing jobs to be lost or duplicated if retry and idempotency are not handled correctly.

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

Line-item information can also require contextual interpretation. For example, a unit price may be expressed per kilometre while the quantity is represented in metres. In that case, directly multiplying quantity by unit price would produce an incorrect result unless the unit is normalized first.

The system therefore needs more than document extraction. It also needs reliable distributed processing, contextual validation, and controlled human review.

The main research questions are:

> How can an asynchronous distributed architecture improve the reliability and scalability of invoice-processing workloads?

and

> Can agentic validation improve the interpretation of ambiguous or inconsistent invoice data while keeping the false acceptance rate low?

---

## 3. Proposed Solution

The proposed solution is a **cloud-native distributed invoice-processing platform**.

The core workflow will be:

```text
Invoice PDF
    ↓
Web / REST API
    ↓
Store Document in S3
    ↓
Create Processing Job
    ↓
Amazon SQS
    ↓
Invoice Worker Service
    ↓
Document Extraction
    ↓
Agentic Validation
    ↓
Auto Accept / Human Review
    ↓
Store Result in PostgreSQL
```

The API will not wait for the full invoice-processing workflow to finish. Instead, it will store the invoice, create a processing job, publish a message to the queue, and return an acknowledgement to the user.

Worker services will consume jobs from the queue and process invoices independently. The distributed design will include:

* Asynchronous message processing
* Idempotency
* Retry handling
* Dead-letter queue (DLQ)
* Processing-state tracking
* Worker failure recovery
* Horizontal worker scaling
* Logging and monitoring

After document extraction, an AI agent will be used for cases that require contextual validation or interpretation.

The agent may use tools such as:

```text
normalize_date()
normalize_unit()
validate_line_items()
validate_amounts()
validate_tax()
check_duplicate()
request_human_review()
```

The backend will mainly be developed using **Java and Spring Boot**.

The first version will be a private deployment for one organization rather than a multi-tenant SaaS product.

---

## 4. System Architecture

The planned architecture is:

```text
                    Client / Web
                         ↓
                Spring Boot REST API
                         ↓
             ┌───────────┴───────────┐
             ↓                       ↓
        Amazon S3               PostgreSQL
      Store Invoice            Job Metadata
             ↓
             └───────────┬───────────┘
                         ↓
                    Amazon SQS
                         ↓
               Invoice Worker Service
                         ↓
                  Amazon Textract
                         ↓
                 Agentic Validation
                         ↓
             Validation / Normalization
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
         Auto Accept           Human Review
              ↓
          PostgreSQL
```

The distributed processing layer is the core system architecture. The AI agent is used after extraction as a validation and decision-support component.

Amazon SQS will decouple the REST API from the invoice workers. If a worker fails before completing a job, the message can become available again for another worker. Idempotency controls will be used to prevent duplicate processing from creating duplicate invoice records.

Messages that repeatedly fail processing can be moved to a dead-letter queue for later investigation or replay.

---

## 5. Main Technologies

The current planned technology stack is:

| Area               | Technology                                    |
| ------------------ | --------------------------------------------- |
| Backend            | Java 17, Spring Boot                          |
| REST API           | Spring Web                                    |
| Database           | PostgreSQL                                    |
| Database Access    | Spring Data JPA                               |
| Document Storage   | Amazon S3                                     |
| Messaging          | Amazon SQS                                    |
| Invoice Extraction | Amazon Textract                               |
| AI Integration     | Spring AI / LLM API                           |
| Agent Tools        | Spring-based tools / MCP where useful         |
| Frontend           | React / TypeScript (Optional)                 |
| Container          | Docker                                        |
| Orchestration      | Kubernetes                                    |
| Infrastructure     | Terraform                                     |
| CI/CD              | GitHub Actions                                |
| Monitoring         | Spring Boot Actuator / Cloud monitoring tools |
| Cloud Platform     | AWS                                           |

Some technologies may be adjusted during implementation depending on project complexity and timeline.

---

## 6. Research and Evaluation

The project will evaluate both the **distributed system design** and the **agentic validation layer**.

### 6.1 Distributed Processing Evaluation

The first experiment will compare a synchronous processing approach with the proposed asynchronous distributed architecture.

#### Baseline — Synchronous Processing

```text
POST Invoice
→ Extract
→ Validate
→ Store
→ Return Response
```

#### Proposed — Asynchronous Processing

```text
POST Invoice
→ Store to S3
→ Create Job
→ Publish to SQS
→ Return Accepted

Worker
→ Consume Job
→ Extract
→ Validate
→ Store Result
```

The evaluation will consider:

* API response latency
* End-to-end processing time
* Throughput under concurrent submissions
* Queue depth under load
* Worker failure recovery
* Retry behaviour
* Duplicate-message handling
* Horizontal scaling of workers

### 6.2 Agentic Validation Evaluation

The second experiment will compare deterministic validation with agentic validation using the same extracted invoice data.

#### Approach A — Fixed Validation

```text
Textract
→ Normalization
→ Fixed Validation Rules
→ Accept / Review
```

#### Approach B — Agentic LLM Validation

```text
Textract
→ AI Validation Agent
→ Select Validation Tools
→ Verify / Retry if Needed
→ Accept / Human Review
```

The evaluation will mainly consider:

* Field interpretation accuracy
* Final decision accuracy
* False acceptance rate
* Automation rate
* Manual review rate
* Processing time
* Number of agent tool calls
* API / LLM cost

One important measurement will be the **false acceptance rate**, which represents cases where the system automatically accepts an invoice even though important extracted or interpreted data is incorrect.

Another measurement will be the **automation rate**, which represents how many invoices can be completed without human review.

The research will evaluate whether agentic validation provides a measurable improvement over fixed validation rules without introducing unacceptable cost or error risk.

---

## 7. Reliability and Failure Handling

The distributed architecture will be designed for failure rather than assuming that every operation succeeds on the first attempt.

Important reliability mechanisms will include:

### Idempotency

The same queue message may be delivered more than once. Each invoice-processing job will therefore have a unique identifier or idempotency key so that duplicate deliveries do not create duplicate results.

```text
Message Received
      ↓
Check Job / Idempotency Key
      ↓
Already Completed?
   ↙           ↘
 Yes            No
 Skip          Process
```

### Retry and Dead-Letter Queue

Temporary failures such as external API errors can be retried. Jobs that repeatedly fail will be moved to a dead-letter queue.

```text
SQS
 ↓
Worker
 ↓
Temporary Failure
 ↓
Retry
 ↓
Repeated Failure
 ↓
Dead-Letter Queue
```

### Worker Failure Recovery

If a worker crashes before completing a message, the job should be available for another worker after the message visibility timeout expires.

### Horizontal Scaling

Multiple worker instances can consume jobs from the same queue.

```text
              SQS
               ↓
      ┌────────┼────────┐
      ↓        ↓        ↓
  Worker 1  Worker 2  Worker 3
```

This architecture will allow the project to evaluate distributed processing behaviour under varying workloads and failure conditions.

---

## 8. Human-in-the-Loop Validation

The system will not assume that every extracted or AI-generated result is correct.

Invoices with uncertain, ambiguous, or inconsistent results will be sent for human review.

For example:

```text
Invoice A

Extraction Confidence: High
Date interpretation: Unambiguous
Line item totals: Valid
Subtotal + Tax = Total: Yes

→ AUTO ACCEPT
```

Compared with:

```text
Invoice B

Extraction Confidence: High
Date: 08/07/2026
Date interpretation: Ambiguous
Line item totals: Inconsistent

→ HUMAN REVIEW
```

This allows the system to combine AI-assisted interpretation with deterministic validation and human oversight.

The goal is not to eliminate human review completely, but to reduce unnecessary manual work while maintaining reliable results.

---

## 9. Project Scope

### In Scope

The project will include:

* Invoice upload
* REST API
* Amazon S3 document storage
* PostgreSQL job and invoice data
* Amazon SQS asynchronous processing
* Worker service implementation
* Idempotency
* Retry handling and DLQ
* Processing-state tracking
* Invoice information extraction
* Agentic validation
* Human-in-the-loop review
* Basic review interface
* Docker
* Kubernetes
* Terraform
* CI/CD
* Logging and monitoring
* Load and failure testing
* Research evaluation

### Out of Scope

To keep the project manageable, I will not implement:

* Full accounts-payable workflow
* Invoice payment
* Full three-way matching
* Automatic ERP posting
* Production integration with a real corporate ERP
* Multi-tenant SaaS architecture
* Custom machine-learning model training
* Complex multi-agent architecture

The project will use a **single validation agent with multiple tools** if agentic validation is implemented.

The main goal is to increase technical depth in distributed backend engineering while using AI as a focused enhancement.

---

## 10. Expected Result

At the end of the project, I expect to have a working prototype where a user can submit an invoice and immediately receive a processing-job identifier.

For example:

```json
{
  "invoiceId": "INV-10021",
  "jobId": "JOB-8f21a4",
  "status": "QUEUED"
}
```

The invoice will then be processed asynchronously by a worker service.

A completed result may look like:

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

If the system identifies an ambiguity or inconsistency, the result may instead be:

```json
{
  "invoiceNumber": "INV-10021",
  "status": "REVIEW_REQUIRED",
  "reason": "Ambiguous date format or inconsistent invoice values"
}
```

The application should also demonstrate:

* Asynchronous distributed processing
* Queue-based workload decoupling
* Retry and dead-letter handling
* Idempotency
* Worker failure recovery
* Horizontal scaling
* AI-assisted validation
* Cloud deployment
* Automated testing
* Infrastructure as Code
* CI/CD
* Monitoring and error handling

The final report will evaluate both the distributed architecture and the agentic validation component.

---

## 11. Project Timeline

| Phase     | Main Work                                  |
| --------- | ------------------------------------------ |
| Weeks 1–2 | Research, requirements, architecture       |
| Weeks 3–4 | Spring Boot REST API and PostgreSQL        |
| Week 5    | Amazon S3 document storage and job model   |
| Week 6    | Amazon SQS and worker service              |
| Week 7    | Retry, DLQ, idempotency, processing states |
| Week 8    | Amazon Textract integration                |
| Week 9    | Agentic validation and validation tools    |
| Week 10   | Docker and local integration testing       |
| Week 11   | Kubernetes deployment                      |
| Week 12   | Terraform and AWS infrastructure           |
| Week 13   | CI/CD and observability                    |
| Week 14   | Load testing and failure testing           |
| Week 15   | Research evaluation and result analysis    |
| Week 16   | Final report and presentation              |

The first priority will be to complete the distributed invoice-processing pipeline.

The AI validation agent will be added after the asynchronous processing, reliability, and extraction components are working.

This keeps the core project useful even if some advanced AI features need to be reduced due to time constraints.

---

## 12. Optional Extension — Outlook Email Integration

If the core project is completed early, I would like to integrate the system with Microsoft Outlook.

The final workflow could be:

```text
Vendor / Sender
      ↓
Send Invoice Email
      ↓
Microsoft Outlook
      ↓
Microsoft Graph Change Notification
      ↓
Spring Boot Backend
      ↓
Create Invoice Processing Job
      ↓
Amazon SQS
      ↓
Invoice Worker
      ↓
Extract + Validate + Decide
      ↓
Database / Human Review
```

For example, during the final demonstration, an invoice PDF could be sent to a dedicated Outlook mailbox.

The application could detect the new email, retrieve the invoice attachment, and automatically submit it to the same distributed invoice-processing pipeline used by the web/API interface.

A possible architecture would be:

```text
Microsoft Outlook
      ↓
Microsoft Graph
      ↓
Webhook / Change Notification
      ↓
Spring Boot
      ↓
Invoice Processing Job
      ↓
SQS / Worker Pipeline
```

MCP may also be explored as a standardized interface for selected tools available to the AI validation agent.

However, Outlook integration and MCP will remain **optional extensions** so that they do not block completion of the main distributed-system project.

---

## 13. Expected Learning Outcomes

Through this project, I want to improve my understanding of:

* Java and Spring Boot backend development
* Distributed systems concepts
* Asynchronous and event-driven architecture
* Message queues and at-least-once delivery
* Idempotency and retry strategies
* Failure recovery and dead-letter queues
* Horizontal scaling
* AWS services
* Docker and Kubernetes
* Infrastructure as Code
* CI/CD
* Automated testing
* System reliability and observability
* AI agents and tool calling
* Human-in-the-loop AI systems
* Evaluation of AI-assisted systems

The project will also allow me to apply these technologies to a business problem that I have previously encountered in a real working environment.

---

## 14. AI Use Section

AI tools will be used during the project for research support, software development, debugging, documentation, and design discussion. AI-generated outputs will be reviewed and validated before they are included in the project.

| AI Tool Name         | Version / Account Type                         | Specific Feature / Use                                       | Value Addition by Student                                    |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| ChatGPT              | GPT-5.6 Sol / ChatGPT Plus                     | Used for project brainstorming, architecture discussion, research-question refinement, technical explanations and proposal drafting. And gramma check. | I defined the original business problem and project scope based on my work experience. I reviewed and modified the proposed architecture, selected the technologies, refined the research methodology, and verified that the solution is realistic for the project. |

---

## 15. Work Date / Hours Log

**Student Name:** Jiayu Lou

The work log will be updated regularly throughout the project. Each entry will record the actual work completed on that day, together with the time spent and the related project output.

| Date          | Number of Hours | Description of Work Done                                     |
| ------------- | --------------: | ------------------------------------------------------------ |
| Sep. 22, 2026 |               1 | Refined the project topic and scope from a general invoice-processing application into a cloud-native distributed invoice-processing platform with agentic validation. |
| Sep. 22, 2026 |               3 | Drafted and revised the proposal, including the distributed architecture, research questions, invoice-validation problems, technology stack, evaluation plan, project scope, and optional Outlook integration. |
|               |                 |                                                              |
|               |                 |                                                              |
|               |                 |                                                              |
|               |                 |                                                              |
|               |                 |                                                              |

