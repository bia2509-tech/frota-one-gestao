import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name").notNull(),
    taxId: text("tax_id").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uidx_companies_tax_id").on(t.taxId)],
);

export const companyUsers = sqliteTable(
  "company_users",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    userId: text("user_id").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    passwordHash: text("password_hash"),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: text("invite_expires_at"),
    role: text("role", {
      enum: ["super_admin", "company_admin", "manager", "operator", "viewer"],
    }).notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    uniqueIndex("uidx_company_users_company_user").on(t.companyId, t.userId),
    uniqueIndex("uidx_company_users_company_email").on(t.companyId, t.email),
    index("idx_company_users_user").on(t.userId),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    companyUserId: text("company_user_id").notNull().references(() => companyUsers.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (t) => [uniqueIndex("uidx_auth_sessions_token_hash").on(t.tokenHash), index("idx_auth_sessions_user_expiry").on(t.companyUserId, t.expiresAt)],
);

export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    number: text("number").notNull(),
    object: text("object").notNull(),
    contractType: text("contract_type"),
    documentKind: text("document_kind").notNull().default("initial"),
    parentContractId: text("parent_contract_id"),
    amendmentNumber: integer("amendment_number"),
    supplierName: text("supplier_name"),
    projectName: text("project_name"),
    supplierId: text("supplier_id"),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    totalCents: integer("total_cents").notNull().default(0),
    monthlyRentCents: integer("monthly_rent_cents").notNull().default(0),
    monthlyLaborCents: integer("monthly_labor_cents").notNull().default(0),
    monthlyAmountCents: integer("monthly_amount_cents").notNull().default(0),
    status: text("status").notNull(),
    formalizationStatus: text("formalization_status").notNull().default("not_informed"),
    formalizationNote: text("formalization_note"),
  },
  (t) => [
    uniqueIndex("uidx_contracts_company_number").on(t.companyId, t.number),
    index("idx_contracts_company_status_end").on(
      t.companyId,
      t.status,
      t.endsAt,
    ),
  ],
);

export const contractDocuments = sqliteTable(
  "contract_documents",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    contractId: text("contract_id").notNull().references(() => contracts.id),
    documentType: text("document_type").notNull(),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
  },
  (t) => [
    index("idx_contract_documents_contract").on(t.companyId, t.contractId),
    uniqueIndex("uidx_contract_documents_object").on(t.objectKey),
  ],
);

export const measurements = sqliteTable(
  "measurements",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id),
    referenceMonth: text("reference_month").notNull(),
    sequence: integer("sequence").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    status: text("status").notNull(),
    approvedAt: text("approved_at"),
  },
  (t) => [
    uniqueIndex("uidx_measurements_contract_sequence").on(
      t.contractId,
      t.sequence,
    ),
    index("idx_measurements_company_month").on(t.companyId, t.referenceMonth),
  ],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_audit_company_created").on(t.companyId, t.createdAt)],
);

export const deletionRequests = sqliteTable(
  "deletion_requests",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    module: text("module").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityLabel: text("entity_label").notNull(),
    reason: text("reason").notNull(),
    snapshotJson: text("snapshot_json"),
    status: text("status", { enum: ["pending", "approved", "rejected", "failed"] }).notNull().default("pending"),
    requestedBy: text("requested_by").notNull(),
    requestedByName: text("requested_by_name"),
    requestedAt: text("requested_at").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedByName: text("reviewed_by_name"),
    reviewedAt: text("reviewed_at"),
    reviewNote: text("review_note"),
  },
  (t) => [
    index("idx_deletion_company_status").on(t.companyId, t.status, t.requestedAt),
    index("idx_deletion_entity").on(t.companyId, t.entityType, t.entityId),
  ],
);

export const userModulePermissions = sqliteTable(
  "user_module_permissions",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    companyUserId: text("company_user_id")
      .notNull()
      .references(() => companyUsers.id),
    module: text("module").notNull(),
    canView: integer("can_view", { mode: "boolean" }).notNull().default(false),
    canCreate: integer("can_create", { mode: "boolean" })
      .notNull()
      .default(false),
    canUpdate: integer("can_update", { mode: "boolean" })
      .notNull()
      .default(false),
    canDelete: integer("can_delete", { mode: "boolean" })
      .notNull()
      .default(false),
    canApprove: integer("can_approve", { mode: "boolean" }).notNull().default(false),
    canCancel: integer("can_cancel", { mode: "boolean" }).notNull().default(false),
    canReopen: integer("can_reopen", { mode: "boolean" }).notNull().default(false),
    canReport: integer("can_report", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    uniqueIndex("uidx_permissions_user_module").on(t.companyUserId, t.module),
    index("idx_permissions_company_module").on(t.companyId, t.module),
  ],
);

export const suppliers = sqliteTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    email: text("email"),
    tradeName: text("trade_name"),
    taxId: text("tax_id"),
    stateRegistration: text("state_registration"),
    address: text("address"),
    district: text("district"),
    zipCode: text("zip_code"),
    city: text("city"),
    state: text("state"),
    contactName: text("contact_name"),
    phone: text("phone"),
    fax: text("fax"),
    freightType: text("freight_type"),
    simpleNational: text("simple_national"),
    paymentMethod: text("payment_method"),
    pixKey: text("pix_key"),
    accountHolder: text("account_holder"),
    accountType: text("account_type"),
    bank: text("bank"),
    bankAgency: text("bank_agency"),
    bankAccount: text("bank_account"),
    financialContact: text("financial_contact"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("idx_suppliers_company_name").on(t.companyId, t.name)],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    category: text("category").notNull(),
    itemType: text("item_type", { enum: ["product", "service"] }).notNull().default("product"),
    application: text("application"),
    manufacturerReference: text("manufacturer_reference"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("uidx_products_company_code").on(t.companyId, t.code), index("idx_products_company_name").on(t.companyId, t.name)],
);

export const equipment = sqliteTable(
  "equipment",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    fleetNumber: text("fleet_number").notNull(),
    plate: text("plate"),
    description: text("description").notNull(),
    equipmentType: text("equipment_type"),
    brand: text("brand"),
    model: text("model"),
    manufactureYear: integer("manufacture_year"),
    chassis: text("chassis"),
    renavam: text("renavam"),
    color: text("color"),
    fuelType: text("fuel_type"),
    serialNumber: text("serial_number"),
    ownerName: text("owner_name"),
    ownerTaxId: text("owner_tax_id"),
    lessorName: text("lessor_name"),
    lessorTaxId: text("lessor_tax_id"),
    ownershipType: text("ownership_type"),
    isCommodatum: integer("is_commodatum", { mode: "boolean" }).notNull().default(false),
    commodatumName: text("commodatum_name"),
    commodatumTaxId: text("commodatum_tax_id"),
    lessorId: text("lessor_id").references(() => suppliers.id),
    status: text("status").notNull().default("available"),
    monthlyRentCents: integer("monthly_rent_cents").notNull().default(0),
    arrivalDate: text("arrival_date"),
    departureDate: text("departure_date"),
    registrationDate: text("registration_date"),
    crlvExpiryDate: text("crlv_expiry_date"),
    tachographCalibrationDate: text("tachograph_calibration_date"),
    tachographExpiryDate: text("tachograph_expiry_date"),
    tachographNumber: text("tachograph_number"),
    insuranceProvider: text("insurance_provider"),
    insurancePolicyNumber: text("insurance_policy_number"),
    insuranceStartDate: text("insurance_start_date"),
    insuranceExpiryDate: text("insurance_expiry_date"),
    projectName: text("project_name"),
    frontName: text("front_name"),
    costCenter: text("cost_center"),
    operatorName: text("operator_name"),
    measurementType: text("measurement_type"),
    currentKilometer: integer("current_kilometer"),
    currentHourmeter: integer("current_hourmeter"),
    entryChecklistStatus: text("entry_checklist_status").default("pending"),
    observation: text("observation"),
  },
  (t) => [
    uniqueIndex("uidx_equipment_company_fleet").on(t.companyId, t.fleetNumber),
    index("idx_equipment_company_plate").on(t.companyId, t.plate),
  ],
);

export const contractEquipmentItems = sqliteTable(
  "contract_equipment_items",
  {
    id: text("id").primaryKey(), companyId: text("company_id").notNull().references(() => companies.id), contractId: text("contract_id").notNull().references(() => contracts.id), equipmentId: text("equipment_id").notNull().references(() => equipment.id),
    startsAt: text("starts_at").notNull(), endsAt: text("ends_at").notNull(), billingMode: text("billing_mode").notNull().default("Mensal"),
    monthlyEquipmentCents: integer("monthly_equipment_cents").notNull().default(0), monthlyOperatorCents: integer("monthly_operator_cents").notNull().default(0), mobilizationCents: integer("mobilization_cents").notNull().default(0), demobilizationCents: integer("demobilization_cents").notNull().default(0), quantityMilli: integer("quantity_milli").notNull().default(1000), status: text("status").notNull().default("mobilized"),
  },
  (t) => [index("idx_contract_items_contract").on(t.companyId, t.contractId), index("idx_contract_items_equipment").on(t.companyId, t.equipmentId)],
);

export const equipmentDocuments = sqliteTable(
  "equipment_documents",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    equipmentId: text("equipment_id").notNull().references(() => equipment.id),
    documentType: text("document_type").notNull(),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    readingStatus: text("reading_status").notNull().default("stored"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
  },
  (t) => [
    index("idx_equipment_documents_equipment").on(t.companyId, t.equipmentId),
    uniqueIndex("uidx_equipment_documents_object").on(t.objectKey),
  ],
);

export const equipmentChecklists = sqliteTable(
  "equipment_checklists",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    equipmentId: text("equipment_id").notNull().references(() => equipment.id),
    checklistType: text("checklist_type").notNull().default("entry"),
    status: text("status").notNull().default("draft"),
    itemsJson: text("items_json").notNull(),
    observation: text("observation"),
    performedBy: text("performed_by").notNull(),
    performedAt: text("performed_at").notNull(),
    approvedAt: text("approved_at"),
  },
  (t) => [index("idx_equipment_checklist_equipment").on(t.companyId, t.equipmentId, t.performedAt)],
);

export const maintenanceOrders = sqliteTable(
  "maintenance_orders",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => equipment.id),
    orderNumber: text("order_number").notNull(),
    orderKind: text("order_kind", { enum: ["daily_maintenance", "purchase_service"] }).notNull().default("daily_maintenance"),
    originMaintenanceOrderId: text("origin_maintenance_order_id"),
    quotationMapId: text("quotation_map_id"),
    maintenanceType: text("maintenance_type").notNull(),
    maintenanceStatus: text("maintenance_status").notNull().default("Em lançamento"),
    maintenanceFormType: text("maintenance_form_type", { enum: ["normal_repair", "accident_repair", "maintenance"] }).notNull().default("normal_repair"),
    description: text("description").notNull(),
    startedAt: text("started_at").notNull(),
    status: text("status").notNull(),
    requestedBy: text("requested_by"),
    preparedBy: text("prepared_by"),
    maintenanceLocation: text("maintenance_location"),
    costCenter: text("cost_center"),
    serviceType: text("service_type"),
    kilometer: integer("kilometer"),
    hourmeter: integer("hourmeter"),
    closedAt: text("closed_at"),
    requestApprovalStatus: text("request_approval_status").notNull().default("draft"),
    approvalRequestedAt: text("approval_requested_at"),
    approvalRequestedBy: text("approval_requested_by"),
    approvedAt: text("approved_at"),
    approvedBy: text("approved_by"),
    requestPrintedAt: text("request_printed_at"),
    requestPrintedBy: text("request_printed_by"),
    notifyLessor: integer("notify_lessor", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (t) => [
    uniqueIndex("uidx_maintenance_company_number").on(
      t.companyId,
      t.orderNumber,
    ),
    index("idx_maintenance_company_status").on(t.companyId, t.status),
  ],
);

export const quotationMaps = sqliteTable(
  "quotation_maps",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    number: text("number").notNull(),
    description: text("description").notNull(),
    costCenter: text("cost_center").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uidx_quotation_company_number").on(t.companyId, t.number)],
);

export const quotationOptions = sqliteTable(
  "quotation_options",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    quotationMapId: text("quotation_map_id").notNull().references(() => quotationMaps.id),
    supplierName: text("supplier_name").notNull(),
    totalCents: integer("total_cents").notNull(),
    paymentTerms: text("payment_terms"),
    deliveryDays: integer("delivery_days"),
    validityDate: text("validity_date"),
    selected: integer("selected", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("idx_quotation_options_map").on(t.quotationMapId)],
);

export const maintenanceOrderItems = sqliteTable(
  "maintenance_order_items",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    maintenanceOrderId: text("maintenance_order_id").notNull().references(() => maintenanceOrders.id),
    itemType: text("item_type", { enum: ["part", "service"] }).notNull(),
    productService: text("product_service").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: text("status"),
    situation: text("situation"),
    model: text("model"),
    invoiceNumber: text("invoice_number"),
    manufacturer: text("manufacturer"),
    supplierName: text("supplier_name"),
    paymentResponsibility: text("payment_responsibility", { enum: ["company", "lessor", "company_charge_lessor"] }).notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    itemOrigin: text("item_origin", { enum: ["direct_purchase", "stock_withdrawal", "lessor_purchase"] }).notNull().default("direct_purchase"),
    tirePreviousIdentification: text("tire_previous_identification"),
    tireCurrentIdentification: text("tire_current_identification"),
    tireDot: text("tire_dot"),
    tireCondition: text("tire_condition", { enum: ["new", "retreaded", "used"] }),
    tireRemovedDestination: text("tire_removed_destination", { enum: ["stock", "discard", "supplier_return", "lessor_return"] }),
    batteryCertificateNumber: text("battery_certificate_number"),
    batteryInvoiceNumber: text("battery_invoice_number"),
    serviceClass: text("service_class").notNull(),
    observation: text("observation"),
    appropriationPosted: integer("appropriation_posted", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_maintenance_items_order").on(t.maintenanceOrderId),
    index("idx_maintenance_items_appropriation").on(t.companyId, t.appropriationPosted),
  ],
);

export const fiscalInvoices = sqliteTable(
  "fiscal_invoices",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    supplierId: text("supplier_id").notNull().references(() => suppliers.id),
    invoiceNumber: text("invoice_number").notNull(),
    accessKey: text("access_key"),
    documentModel: text("document_model"),
    series: text("series"),
    issueDate: text("issue_date").notNull(),
    entryDate: text("entry_date").notNull(),
    dueDate: text("due_date"),
    purchaseOrder: text("purchase_order"),
    costCenter: text("cost_center").notNull(),
    totalCents: integer("total_cents").notNull().default(0),
    status: text("status", { enum: ["draft", "pending_review", "approved", "cancelled"] }).notNull().default("draft"),
    accountingChecked: integer("accounting_checked", { mode: "boolean" }).notNull().default(false),
    pickedUp: integer("picked_up", { mode: "boolean" }).notNull().default(false),
    stockUpdated: integer("stock_updated", { mode: "boolean" }).notNull().default(false),
    observation: text("observation"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_invoice_company_supplier_number_issue").on(t.companyId, t.supplierId, t.invoiceNumber, t.issueDate),
    index("idx_invoice_company_entry_status").on(t.companyId, t.entryDate, t.status),
  ],
);

export const fiscalInvoiceItems = sqliteTable(
  "fiscal_invoice_items",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    invoiceId: text("invoice_id").notNull().references(() => fiscalInvoices.id),
    productId: text("product_id").references(() => products.id),
    description: text("description").notNull(),
    category: text("category").notNull(),
    ncm: text("ncm"),
    cfop: text("cfop"),
    cst: text("cst"),
    quantityMilli: integer("quantity_milli").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    freightCents: integer("freight_cents").notNull().default(0),
    ipiCents: integer("ipi_cents").notNull().default(0),
    icmsCents: integer("icms_cents").notNull().default(0),
    pisCents: integer("pis_cents").notNull().default(0),
    cofinsCents: integer("cofins_cents").notNull().default(0),
    issCents: integer("iss_cents").notNull().default(0),
    cbsCents: integer("cbs_cents").notNull().default(0),
    ibsCents: integer("ibs_cents").notNull().default(0),
    selectiveTaxCents: integer("selective_tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    equipmentId: text("equipment_id").references(() => equipment.id),
    maintenanceOrderId: text("maintenance_order_id").references(() => maintenanceOrders.id),
    serviceDescription: text("service_description"),
    stockEntry: integer("stock_entry", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_invoice_items_invoice").on(t.invoiceId), index("idx_invoice_items_equipment").on(t.companyId, t.equipmentId)],
);

export const fiscalInvoicePayments = sqliteTable(
  "fiscal_invoice_payments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    invoiceId: text("invoice_id").notNull().references(() => fiscalInvoices.id),
    installment: integer("installment").notNull(),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status", { enum: ["payable", "paid", "cancelled"] }).notNull().default("payable"),
  },
  (t) => [index("idx_invoice_payments_invoice").on(t.invoiceId)],
);

export const fiscalCreditNotes = sqliteTable(
  "fiscal_credit_notes",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    supplierId: text("supplier_id").notNull().references(() => suppliers.id),
    fiscalInvoiceId: text("fiscal_invoice_id").references(() => fiscalInvoices.id),
    creditNumber: text("credit_number").notNull(),
    issueDate: text("issue_date").notNull(),
    originalCents: integer("original_cents").notNull(),
    remainingCents: integer("remaining_cents").notNull(),
    status: text("status", { enum: ["available", "exhausted", "cancelled"] }).notNull().default("available"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_credit_company_supplier_number_date").on(t.companyId, t.supplierId, t.creditNumber, t.issueDate),
    index("idx_credit_company_supplier_status").on(t.companyId, t.supplierId, t.status),
  ],
);

export const fuelCreditUsages = sqliteTable(
  "fuel_credit_usages",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    creditNoteId: text("credit_note_id").notNull().references(() => fiscalCreditNotes.id),
    fuelEntryId: text("fuel_entry_id").notNull().references(() => fuelEntries.id),
    amountCents: integer("amount_cents").notNull(),
    idempotencyKey: text("idempotency_key"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_fuel_credit_usage_request").on(t.companyId, t.idempotencyKey),
    index("idx_fuel_credit_usage_note").on(t.companyId, t.creditNoteId, t.createdAt),
    index("idx_fuel_credit_usage_entry").on(t.companyId, t.fuelEntryId),
  ],
);

export const fuelStockMovements = sqliteTable(
  "fuel_stock_movements",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    convoyId: text("convoy_id").notNull().references(() => fuelConvoys.id),
    movementType: text("movement_type", { enum: ["receipt", "distribution", "adjustment"] }).notNull(),
    movementDate: text("movement_date").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    deltaMilli: integer("delta_milli").notNull(),
    unitPriceMilli: integer("unit_price_milli").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    supplierId: text("supplier_id").references(() => suppliers.id),
    invoiceId: text("invoice_id").references(() => fiscalInvoices.id),
    invoiceItemId: text("invoice_item_id").references(() => fiscalInvoiceItems.id),
    fuelEntryId: text("fuel_entry_id").references(() => fuelEntries.id),
    destinationEquipmentId: text("destination_equipment_id").references(() => equipment.id),
    maintenanceLocation: text("maintenance_location"),
    costCenter: text("cost_center"),
    referenceKey: text("reference_key"),
    observation: text("observation"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_fuel_movement_reference").on(t.companyId, t.referenceKey),
    index("idx_fuel_movements_company_convoy_date").on(t.companyId, t.convoyId, t.movementDate),
    uniqueIndex("uidx_fuel_movements_invoice_item").on(t.companyId, t.invoiceItemId),
  ],
);

export const dailyPartEntries = sqliteTable(
  "daily_part_entries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => equipment.id),
    systemNumber: integer("system_number"),
    entryDate: text("entry_date").notNull(),
    status: text("status", { enum: ["T", "D", "M", "AB"] }).notNull(),
    maintenanceOrderId: text("maintenance_order_id").references(
      () => maintenanceOrders.id,
    ),
    hourmeterStart: integer("hourmeter_start"),
    hourmeterEnd: integer("hourmeter_end"),
    kilometerStart: integer("kilometer_start"),
    kilometerEnd: integer("kilometer_end"),
    observation: text("observation"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_daily_part_company_equipment_date").on(
      t.companyId,
      t.equipmentId,
      t.entryDate,
    ),
    index("idx_daily_part_company_date").on(t.companyId, t.entryDate),
    index("idx_daily_part_equipment_os_date").on(
      t.equipmentId,
      t.maintenanceOrderId,
      t.entryDate,
    ),
  ],
);

export const fuelEntries = sqliteTable(
  "fuel_entries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => equipment.id),
    systemNumber: integer("system_number"),
    entryDate: text("entry_date").notNull(),
    rn: text("rn"),
    station: text("station"),
    maintenanceLocation: text("maintenance_location"),
    driverName: text("driver_name"),
    product: text("product").notNull(),
    productCode: text("product_code"),
    litersMilli: integer("liters_milli").notNull(),
    unitPriceMilli: integer("unit_price_milli").notNull(),
    totalCents: integer("total_cents").notNull(),
    kilometer: integer("kilometer"),
    hourmeter: integer("hourmeter"),
    status: text("status", { enum: ["draft", "confirmed", "cancelled"] }).notNull().default("confirmed"),
    source: text("source", { enum: ["manual", "spreadsheet"] }).notNull(),
    importFileName: text("import_file_name"),
    entryTime: text("entry_time"),
    requisitionCoupon: text("requisition_coupon"),
    supplierId: text("supplier_id").references(() => suppliers.id),
    invoiceId: text("invoice_id").references(() => fiscalInvoices.id),
    fuelConvoyId: text("fuel_convoy_id"),
    costCenter: text("cost_center"),
    receiptObjectKey: text("receipt_object_key"),
    originalExternalId: text("original_external_id"),
    sourceFingerprint: text("source_fingerprint"),
    transactionType: text("transaction_type", { enum: ["consumption", "stock_receipt", "distribution"] }).notNull().default("consumption"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_fuel_company_date").on(t.companyId, t.entryDate),
    index("idx_fuel_equipment_date").on(t.equipmentId, t.entryDate),
    uniqueIndex("uidx_fuel_company_system_number").on(t.companyId, t.systemNumber),
    uniqueIndex("uidx_fuel_company_rn").on(t.companyId, t.rn),
    uniqueIndex("uidx_fuel_company_fingerprint").on(t.companyId, t.sourceFingerprint),
    index("idx_fuel_company_supplier_date").on(t.companyId, t.supplierId, t.entryDate),
    index("idx_fuel_company_convoy_date").on(t.companyId, t.fuelConvoyId, t.entryDate),
  ],
);

export const fuelConvoys = sqliteTable(
  "fuel_convoys",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    equipmentId: text("equipment_id").notNull().references(() => equipment.id),
    convoyNumber: text("convoy_number").notNull(),
    maintenanceLocationId: text("maintenance_location_id"),
    maintenanceLocation: text("maintenance_location"),
    costCenter: text("cost_center"),
    supplierId: text("supplier_id").references(() => suppliers.id),
    capacityMilli: integer("capacity_milli").notNull().default(0),
    openingBalanceMilli: integer("opening_balance_milli").notNull().default(0),
    status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_fuel_convoy_company_number").on(t.companyId, t.convoyNumber),
    uniqueIndex("uidx_fuel_convoy_equipment").on(t.companyId, t.equipmentId),
    index("idx_fuel_convoy_company_status").on(t.companyId, t.status),
  ],
);

export const fuelConvoySequences = sqliteTable(
  "fuel_convoy_sequences",
  {
    companyId: text("company_id").primaryKey().references(() => companies.id),
    lastNumber: integer("last_number").notNull().default(0),
  },
);

export const quickServiceEntries = sqliteTable(
  "quick_service_entries",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    equipmentId: text("equipment_id").notNull().references(() => equipment.id),
    systemNumber: integer("system_number"),
    entryDate: text("entry_date").notNull(),
    category: text("category").notNull(),
    serviceDescription: text("service_description").notNull(),
    supplierName: text("supplier_name"),
    driverName: text("driver_name"),
    quantityMilli: integer("quantity_milli").notNull().default(1000),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    kilometer: integer("kilometer"),
    hourmeter: integer("hourmeter"),
    costCenter: text("cost_center"),
    requisitionNumber: text("requisition_number"),
    paymentResponsibility: text("payment_responsibility", { enum: ["company", "lessor"] }).notNull().default("company"),
    invoiceNumber: text("invoice_number"),
    status: text("status", { enum: ["draft", "confirmed", "cancelled"] }).notNull().default("confirmed"),
    source: text("source", { enum: ["manual", "spreadsheet"] }).notNull(),
    importFileName: text("import_file_name"),
    observation: text("observation"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_quick_service_company_date").on(t.companyId, t.entryDate),
    index("idx_quick_service_equipment_date").on(t.equipmentId, t.entryDate),
    uniqueIndex("uidx_quick_service_company_system_number").on(t.companyId, t.systemNumber),
  ],
);

export const appropriationAdjustments = sqliteTable(
  "appropriation_adjustments",
  {
    id: text("id").primaryKey(),
    correctionId: text("correction_id").notNull(),
    companyId: text("company_id").notNull().references(() => companies.id),
    equipmentId: text("equipment_id").references(() => equipment.id),
    itemId: text("item_id").notNull(),
    scope: text("scope", { enum: ["appropriation", "measurement"] }).notNull(),
    referenceMonth: text("reference_month").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    supplierName: text("supplier_name"),
    fieldName: text("field_name").notNull(),
    oldValue: text("old_value").notNull(),
    newValue: text("new_value").notNull(),
    justification: text("justification").notNull(),
    createdBy: text("created_by").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_appropriation_adjustment_period").on(t.companyId, t.referenceMonth, t.periodStart, t.periodEnd),
    index("idx_appropriation_adjustment_item").on(t.companyId, t.itemId, t.createdAt),
    index("idx_appropriation_adjustment_correction").on(t.correctionId),
  ],
);

export const emailNotifications = sqliteTable(
  "email_notifications",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    maintenanceOrderId: text("maintenance_order_id")
      .notNull()
      .references(() => maintenanceOrders.id),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull(),
    sentAt: text("sent_at"),
  },
  (t) => [index("idx_email_company_status").on(t.companyId, t.status)],
);

export const backupSnapshots = sqliteTable(
  "backup_snapshots",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    recordCount: integer("record_count").notNull().default(0),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_backup_object_key").on(t.objectKey),
    index("idx_backup_company_created").on(t.companyId, t.createdAt),
  ],
);

export const masterData = sqliteTable(
  "master_data",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id),
    type: text("type").notNull(),
    code: text("code"),
    name: text("name").notNull(),
    description: text("description"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_master_company_type_code_name").on(t.companyId, t.type, t.code, t.name),
    index("idx_master_company_type_active").on(t.companyId, t.type, t.active),
  ],
);
