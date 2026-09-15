---
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- dense
- generated_from_trainer
- dataset_size:250
- loss:MultipleNegativesRankingLoss
base_model: sentence-transformers/all-MiniLM-L6-v2
widget:
- source_sentence: SOC 2 Type II audit report security trust principles and access
    control remediation
  sentences:
  - 'INTERNAL REVENUE SERVICE Form W-9

    Taxpayer Name: CyberShield Security Ltd.

    Business Name: CyberShield Security Ltd. Operating LLC

    Tax Classification: Individual/Sole Proprietor

    TIN/EIN: 41-8195740

    Address: 500 Howard Street, Suite 300, San Francisco, CA 94105

    Certification Signature: Jane Doe, Authorized Corporate Controller

    Signature Date: 2026-01-15

    Is Signed: Yes'
  - 'INVOICE Starlight Digital Media

    Invoice Number: SDM-202612

    Date: 2026-03-15

    Due: 2026-04-14

    Subtotal: $12,887.29

    Tax: $1,095.42

    Total: $13,832.71

    Line Items:

    - Cloud Compute Instance Hours (vCPU 16, 64GB RAM) (Qty: 7) = $4872.49

    - Enterprise Dedicated Support & SLA Monitoring (Qty: 10) = $7117.4

    - Automated Model Inference Compute (Qty: 2) = $897.4'
  - 'ISO/IEC 27001 COMPLIANCE AUDIT REPORT

    Document: Annual Security Assessment 24

    Standard: ISO/IEC 27001

    Audit Date: 2026-04-16

    Remediation Deadline: 2026-07-15

    Clauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda.'
- source_sentence: GDPR data privacy impact assessment and data subject rights policy
  sentences:
  - 'INVOICE Vertex Hardware Group

    Invoice Number: VHG-202607

    Date: 2026-04-05

    Due: 2026-05-05

    Subtotal: $15,277.98

    Tax: $1,298.63

    Total: $16,576.61

    Line Items:

    - Enterprise Dedicated Support & SLA Monitoring (Qty: 1) = $661.15

    - SIEM Security Telemetry Ingestion (Qty: 4) = $2525.12

    - Enterprise Dedicated Support & SLA Monitoring (Qty: 7) = $4685.31

    - SIEM Security Telemetry Ingestion (Qty: 10) = $7406.4'
  - 'ISO/IEC 27001 COMPLIANCE AUDIT REPORT

    Document: Annual Security Assessment 19

    Standard: ISO/IEC 27001

    Audit Date: 2026-05-23

    Remediation Deadline: 2025-11-30 (OVERDUE)

    Clauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda.'
  - 'PURCHASE ORDER: PO-2026-8023

    Buyer: DocIntel Enterprise Corp.

    Vendor: Vertex Hardware Group

    Order Date: 2026-05-29

    Delivery Date: 2026-07-13

    Payment Terms: Net 45

    Subtotal: $11,450.00

    Tax: $944.62

    Total Amount: $12,394.62

    Approval Status: approved

    Approver: Marcus Vance, VP Global Procurement

    Line Items:

    - High-Performance Server Blade Node (Qty: 1) @ $4,200.00 = $4,200.00

    - Redundant Power Supply Unit 1200W (Qty: 3) @ $350.00 = $1,050.00

    - Precision Air Conditioning Unit (Qty: 1) @ $6,200.00 ='
- source_sentence: Enterprise PO itemized quantities, unit prices, and approved shipping
    destination
  sentences:
  - 'PURCHASE ORDER: PO-2026-8025

    Buyer: DocIntel Enterprise Corp.

    Vendor: BioHealth Analytics

    Order Date: 2026-03-20

    Delivery Date: 2026-05-04

    Payment Terms: Net 45

    Subtotal: $12,750.00

    Tax: $1,051.88

    Total Amount: $13,801.88

    Approval Status: approved

    Approver: Marcus Vance, VP Global Procurement

    Line Items:

    - Redundant Power Supply Unit 1200W (Qty: 1) @ $350.00 = $350.00

    - Cisco Nexus 48-Port Switch (Qty: 2) @ $1,950.00 = $3,900.00

    - NVMe Enterprise Storage Array 100TB (Qty: 1) @ $8,500.00 = $8,500'
  - 'INTERNAL REVENUE SERVICE Form 1099-NEC

    Taxpayer Name: Quantum Logistics Inc.

    Business Name: Quantum Logistics Inc. Operating LLC

    Tax Classification: C Corporation

    TIN/EIN: 88-3638160

    Address: 500 Howard Street, Suite 300, San Francisco, CA 94105

    Certification Signature: Jane Doe, Authorized Corporate Controller

    Signature Date: 2026-01-15

    Is Signed: Yes'
  - 'INTERNAL REVENUE SERVICE Form W-9

    Taxpayer Name: DataStream Networks

    Business Name: DataStream Networks Operating LLC

    Tax Classification: Individual/Sole Proprietor

    TIN/EIN: 86-6381786

    Address: 500 Howard Street, Suite 300, San Francisco, CA 94105

    Certification Signature: Jane Doe, Authorized Corporate Controller

    Signature Date: 2026-01-15

    Is Signed: Yes'
- source_sentence: IRS Form 1099-NEC nonemployee compensation reported gross earnings
  sentences:
  - 'INTERNAL REVENUE SERVICE Form 1099-NEC

    Taxpayer Name: Quantum Logistics Inc.

    Business Name: Quantum Logistics Inc. Operating LLC

    Tax Classification: C Corporation

    TIN/EIN: 37-3368990

    Address: 500 Howard Street, Suite 300, San Francisco, CA 94105

    Certification Signature: Jane Doe, Authorized Corporate Controller

    Signature Date: 2026-01-15

    Is Signed: Yes'
  - 'PCI-DSS V4.0 COMPLIANCE AUDIT REPORT

    Document: Annual Security Assessment 8

    Standard: PCI-DSS v4.0

    Audit Date: 2026-06-04

    Remediation Deadline: 2026-09-02

    Clauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda.'
  - 'PURCHASE ORDER: PO-2026-8012

    Buyer: DocIntel Enterprise Corp.

    Vendor: TechCorp Solutions LLC

    Order Date: 2026-02-13

    Delivery Date: 2026-03-30

    Payment Terms: Net 45

    Subtotal: $15,360.00

    Tax: $1,267.20

    Total Amount: $16,627.20

    Approval Status: approved

    Approver: Marcus Vance, VP Global Procurement

    Line Items:

    - Precision Air Conditioning Unit (Qty: 1) @ $6,200.00 = $6,200.00

    - Fiber Optic Transceiver Module 100G (Qty: 3) @ $220.00 = $660.00

    - NVMe Enterprise Storage Array 100TB (Qty: 1) @ $8,500.0'
- source_sentence: What is the invoice number, total amount due, and vendor payment
    remittance address?
  sentences:
  - 'INVOICE Quantum Logistics Inc.

    Invoice Number: QL-202622

    Date: 2026-06-05

    Due: 2026-07-05

    Subtotal: $5,678.44

    Tax: $482.67

    Total: $6,161.11

    Line Items:

    - Automated Model Inference Compute (Qty: 1) = $528.28

    - API Gateway Throughput & Webhook Pipeline (Qty: 8) = $5150.16'
  - 'INTERNAL REVENUE SERVICE Form 1099-NEC

    Taxpayer Name: Vertex Hardware Group

    Business Name: Vertex Hardware Group Operating LLC

    Tax Classification: S Corporation

    TIN/EIN: 81-3371392

    Address: 500 Howard Street, Suite 300, San Francisco, CA 94105

    Certification Signature: Jane Doe, Authorized Corporate Controller

    Signature Date: 2026-01-15

    Is Signed: Yes'
  - 'ISO/IEC 27001 COMPLIANCE AUDIT REPORT

    Document: Annual Security Assessment 2

    Standard: ISO/IEC 27001

    Audit Date: 2026-02-22

    Remediation Deadline: 2026-05-23

    Clauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda.'
pipeline_tag: sentence-similarity
library_name: sentence-transformers
---

# SentenceTransformer based on sentence-transformers/all-MiniLM-L6-v2

This is a [sentence-transformers](https://www.SBERT.net) model finetuned from [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). It maps sentences & paragraphs to a 384-dimensional dense vector space and can be used for semantic textual similarity, semantic search, paraphrase mining, text classification, clustering, and more.

## Model Details

### Model Description
- **Model Type:** Sentence Transformer
- **Base model:** [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) <!-- at revision 1110a243fdf4706b3f48f1d95db1a4f5529b4d41 -->
- **Maximum Sequence Length:** 256 tokens
- **Output Dimensionality:** 384 dimensions
- **Similarity Function:** Cosine Similarity
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Sentence Transformers on Hugging Face](https://huggingface.co/models?library=sentence-transformers)

### Full Model Architecture

```
SentenceTransformer(
  (0): Transformer({'max_seq_length': 256, 'do_lower_case': False, 'architecture': 'BertModel'})
  (1): Pooling({'word_embedding_dimension': 384, 'pooling_mode_cls_token': False, 'pooling_mode_mean_tokens': True, 'pooling_mode_max_tokens': False, 'pooling_mode_mean_sqrt_len_tokens': False, 'pooling_mode_weightedmean_tokens': False, 'pooling_mode_lasttoken': False, 'include_prompt': True})
  (2): Normalize()
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import SentenceTransformer

# Download from the 🤗 Hub
model = SentenceTransformer("sentence_transformers_model_id")
# Run inference
sentences = [
    'What is the invoice number, total amount due, and vendor payment remittance address?',
    'INVOICE Quantum Logistics Inc.\nInvoice Number: QL-202622\nDate: 2026-06-05\nDue: 2026-07-05\nSubtotal: $5,678.44\nTax: $482.67\nTotal: $6,161.11\nLine Items:\n- Automated Model Inference Compute (Qty: 1) = $528.28\n- API Gateway Throughput & Webhook Pipeline (Qty: 8) = $5150.16',
    'INTERNAL REVENUE SERVICE Form 1099-NEC\nTaxpayer Name: Vertex Hardware Group\nBusiness Name: Vertex Hardware Group Operating LLC\nTax Classification: S Corporation\nTIN/EIN: 81-3371392\nAddress: 500 Howard Street, Suite 300, San Francisco, CA 94105\nCertification Signature: Jane Doe, Authorized Corporate Controller\nSignature Date: 2026-01-15\nIs Signed: Yes',
]
embeddings = model.encode(sentences)
print(embeddings.shape)
# [3, 384]

# Get the similarity scores for the embeddings
similarities = model.similarity(embeddings, embeddings)
print(similarities)
# tensor([[1.0000, 0.5987, 0.3426],
#         [0.5987, 1.0000, 0.3719],
#         [0.3426, 0.3719, 1.0000]])
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset

* Size: 250 training samples
* Columns: <code>sentence_0</code> and <code>sentence_1</code>
* Approximate statistics based on the first 250 samples:
  |         | sentence_0                                                                        | sentence_1                                                                          |
  |:--------|:----------------------------------------------------------------------------------|:------------------------------------------------------------------------------------|
  | type    | string                                                                            | string                                                                              |
  | details | <ul><li>min: 13 tokens</li><li>mean: 15.6 tokens</li><li>max: 22 tokens</li></ul> | <ul><li>min: 53 tokens</li><li>mean: 98.07 tokens</li><li>max: 173 tokens</li></ul> |
* Samples:
  | sentence_0                                                                                       | sentence_1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
  |:-------------------------------------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
  | <code>Form W-9 Request for Taxpayer Identification Number and Certification</code>               | <code>INTERNAL REVENUE SERVICE Form 1099-NEC<br>Taxpayer Name: DataStream Networks<br>Business Name: DataStream Networks Operating LLC<br>Tax Classification: Individual/Sole Proprietor<br>TIN/EIN: 24-3698060<br>Address: 500 Howard Street, Suite 300, San Francisco, CA 94105<br>Certification Signature: ___________________________ [UNSIGNED]<br>Signature Date: NONE<br>Is Signed: No</code>                                                                                                                                                                        |
  | <code>SOC 2 Type II audit report security trust principles and access control remediation</code> | <code>PCI-DSS V4.0 COMPLIANCE AUDIT REPORT<br>Document: Annual Security Assessment 25<br>Standard: PCI-DSS v4.0<br>Audit Date: 2026-06-10<br>Remediation Deadline: 2026-09-08<br>Clauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda.</code>                                                                                                                                                                                                                                                                                                                |
  | <code>Purchase order procurement requisition number and vendor delivery terms</code>             | <code>PURCHASE ORDER: PO-2026-8019<br>Buyer: DocIntel Enterprise Corp.<br>Vendor: Horizon Dynamics Corp.<br>Order Date: 2026-01-25<br>Delivery Date: 2026-02-24<br>Payment Terms: Net 45<br>Subtotal: $9,200.00<br>Tax: $759.00<br>Total Amount: $9,959.00<br>Approval Status: approved<br>Approver: Marcus Vance, VP Global Procurement<br>Line Items:<br>- Redundant Power Supply Unit 1200W (Qty: 3) @ $350.00 = $1,050.00<br>- Cisco Nexus 48-Port Switch (Qty: 1) @ $1,950.00 = $1,950.00<br>- Precision Air Conditioning Unit (Qty: 1) @ $6,200.00 = $6,200.00</code> |
* Loss: [<code>MultipleNegativesRankingLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#multiplenegativesrankingloss) with these parameters:
  ```json
  {
      "scale": 20.0,
      "similarity_fct": "cos_sim",
      "gather_across_devices": false,
      "directions": [
          "query_to_doc"
      ],
      "partition_mode": "joint",
      "hardness_mode": null,
      "hardness_strength": 0.0
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 1
- `per_device_eval_batch_size`: 16
- `multi_dataset_batch_sampler`: round_robin

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `per_device_train_batch_size`: 16
- `num_train_epochs`: 1
- `max_steps`: -1
- `learning_rate`: 5e-05
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: None
- `warmup_steps`: 0
- `optim`: adamw_torch_fused
- `optim_args`: None
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `optim_target_modules`: None
- `gradient_accumulation_steps`: 1
- `average_tokens_across_devices`: True
- `max_grad_norm`: 1
- `label_smoothing_factor`: 0.0
- `bf16`: False
- `fp16`: False
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `use_cache`: False
- `neftune_noise_alpha`: None
- `torch_empty_cache_steps`: None
- `auto_find_batch_size`: False
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `include_num_input_tokens_seen`: no
- `log_level`: passive
- `log_level_replica`: warning
- `disable_tqdm`: False
- `project`: huggingface
- `trackio_space_id`: trackio
- `eval_strategy`: no
- `per_device_eval_batch_size`: 16
- `prediction_loss_only`: True
- `eval_on_start`: False
- `eval_do_concat_batches`: True
- `eval_use_gather_object`: False
- `eval_accumulation_steps`: None
- `include_for_metrics`: []
- `batch_eval_metrics`: False
- `save_only_model`: False
- `save_on_each_node`: False
- `enable_jit_checkpoint`: False
- `push_to_hub`: False
- `hub_private_repo`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_always_push`: False
- `hub_revision`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `restore_callback_states_from_checkpoint`: False
- `full_determinism`: False
- `seed`: 42
- `data_seed`: None
- `use_cpu`: False
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `dataloader_prefetch_factor`: None
- `remove_unused_columns`: True
- `label_names`: None
- `train_sampling_strategy`: random
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `ddp_backend`: None
- `ddp_timeout`: 1800
- `fsdp`: []
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `deepspeed`: None
- `debug`: []
- `skip_memory_metrics`: True
- `do_predict`: False
- `resume_from_checkpoint`: None
- `warmup_ratio`: None
- `local_rank`: -1
- `prompts`: None
- `batch_sampler`: batch_sampler
- `multi_dataset_batch_sampler`: round_robin
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Framework Versions
- Python: 3.13.7
- Sentence Transformers: 5.3.0
- Transformers: 5.3.0
- PyTorch: 2.10.0+cpu
- Accelerate: 1.13.0
- Datasets: 4.8.4
- Tokenizers: 0.22.2

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

#### MultipleNegativesRankingLoss
```bibtex
@misc{oord2019representationlearningcontrastivepredictive,
      title={Representation Learning with Contrastive Predictive Coding},
      author={Aaron van den Oord and Yazhe Li and Oriol Vinyals},
      year={2019},
      eprint={1807.03748},
      archivePrefix={arXiv},
      primaryClass={cs.LG},
      url={https://arxiv.org/abs/1807.03748},
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->