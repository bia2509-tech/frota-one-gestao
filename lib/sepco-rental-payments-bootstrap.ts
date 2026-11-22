import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, fiscalInvoiceItems, fiscalInvoicePayments, fiscalInvoices, masterData, suppliers } from "@/db/schema";

const SEPCO_TAX_ID = "14139738002001";
const IMPORT_MARKER = "importacao-locacoes-pagamento-2026-11-20-v2-somente-quitadas";
const RENTAL_DATA_GZIP_BASE64 = "H4sIAJwlAGsC/+1dy3LjWBl+FVXWkebcL+yURElrsK2M7GTRFIt0t2cmxXTSpNPAFEUVFIspFqwoNmxZ8A5s8yY8CefIsiPpHMmydWzJhq6amkRW7F//5/9+Ob/4/cnD3cf5yc9OJsF1MplFU+88mUxn6c15on6O1G/jKD2PE280uwhPTk+e734Xf1C3Ax5ISQJIxVcAAORTol58d/fwK/XaWRpeRNPzRF25+27+8P5HfT8EiPhYX3r//vHLw7O6hoWQ3Ifq2v3Dbx7v388nXz6+mz+pVyChTN/6Ud95Pn94/nzyM0qA/nd68jT/dv6k3nY+fnx4/l7dPY1m0fgs1Z93//nzl/nF3bN+IgQQ84H0gf4E9R5PPxZfgNCHQr3wYXn/w5cffjg9+fTl6f33d5/nydOHjJKrt2f+KJkB7K/+ikr9Z/PP75/uPz3fPz6ou0bJefjy08ufE+8i8qJvbuLrcBxNZsnU89vw1fO95TN4+mPU79nTqs/5dPfjR0X79Pnu+Ytigvr9/oO6/NvHp199+8Pjb1fX1WfOQoXQH05XiEbBeaDpGcXj0NMUXiRpqC/cRi9/Pb8ZJdMCnhgFmOAAIqLxhD5jJTyn8aiIJmSM+bwMJgwYohnCVTQxYbCKJiRMEClF/3AybMB5Gc5uFKs03QqKBnC99Ty2YLt49lMpOuJ7o97yOo2ms1fyplF6G7/8pD62Iq8UBBgoiABc4AtQs7wiQkrwIim45MAmq1VomaBEYOwSWbY5ssDHwBTUySXQkK5nnbppnJzFo/htfofvZc91inE31MLbaHKeZN+VTBVUcCI0AIwFgrMFTly+4jS9f//4+K6IEsEZJK8wCSiIAtcCE+VVnIhwrlD5VjhBWSeBk0sPUL5GBm0c1ZevkulsJXNEBPpZu+rUs6vrUTjxoslVNHkTpnFo2EUQQEEDxPECPyoK+IWTWTi5iNIihBjSsqRBqFHhwhc2YcOGXcRgCHZRw8jrYFRUewoDO/MsCjJ7pM5YTfXX5So8S+NotPwC/d2UOCQDoiyfFLnEUbZGM0Imy5YPSYh8ZkHLwAoyIYmynf3rxsWf2cACQEPQxDybScse7DTzGjpAliYX8XQUxd4kvAqTny9M6nmYFBWkMmQiU5K5owLXCRgioixg6uuFmZQ+svkqEEtDwhRk1CphCx1jhUzUQLZ8oRmyxUW7V6IoVByvY1VR7wVeRnpnSeoflkwngoVFL0sUrNN+fWCj7NWK0tYYZY/QGaM3lw06DtNASGUBpcy9CromWtNKzqeVaI0J4BMLOKgKCsecY6sHqBXKyIoJqcOEdMQEKOXsmdzRHoImZqnBOA4U0Z3du3F0FXrx+PrlL6kK7sKbWTJ++dttFJuQECUsMuCILyAhvCAw8XmSnJWkBWNUdvSQ0v2ojTsOJa2TkD2C0cyXRg/vFaYjiYcNiBACA4BoIS9TL40uo1SxPvLC7rGvK/BmaTiZKn2a3IYjT/v7ioyLMMukhOlVaIgXIIHyywK0jHelaMRP6WtfVtxwpK7xNuoOEwq1mXUCH6vAl1/mi8stYGyCrBUXHaJ2M0uTyWtklgfZ52Z6AiAFFQqkBLmBKojb9O7h+e5BP29j2ISBQBJTq4XikJpq8RBlrpmhDpHr3Y4hU0nW2bFxGNv9PFqHF+3BjGkqj0mkMDAQkgNAyLlEOcKtd4HC7QXq65vJGzterA4v7kNgMVsqoJInu5asjFwHEPUf5iKJhAkTl1IyK0yjGpj4zmCqReHgEz/qNYP1nOgi1f9Zv4/kjrI0hmMt9b/jZv848K7C0a1+3/r8DYUqEoUBYnn+hjXaBKICkhL3JdbFd2pjfa41y64xp9ievtncju+O7do01/LOnd3uveJjyXnWpgv6MNz1ADWVfFzZ7OQ8vlCfpsLZVUdFg0uMAypBQCFdQCX4GqgIx4ZLDCijOEsWGNYbGjVWCHRqiA1clI4IAkRMCA5CWjpakTDzmtUbTdT/r+PJmyhOE+8yXtjJJfchDBiHgYB5ViyL4RrqAOGVBzhEldSY+kuChLDmNhEwspt1iZYFe0zmw/8zf1GE2ZTzRo4LC2w35EfD+v5r/Ga9hRNqVfl1TN+hsnl8f/fyr5d/Pnof5l706y/3n+40ox8/e//549+8qX7h6u7d0/08+/3rLw/fPzowyaOwiERDTxqBAVfek4R5hooVekgnN6X8fNmdhRAiIZk1O28WV/ABOLPHGD1jqKNnccTa5ypKZvFkWvy6q/cfh+rWSVZVKbnD1W8/CzCD6r9l3IDXIIIIRQYiACIkWonB/4Ib1GMThOH6MymOn+HT2ajS2F7X2IphAChQZljkaW1cSmGk0UXpu45ApZyujCqxMp5Rw+/hrIbzl9FtlGrnzMp9tDPuq+/WdTQN9RDAuLEaUeWn761IXjaqVG45ePw4QG0jBu1pK0fCCh4eIngLeo8XOSPYZm6Rq2mFwC1bIV49TwVWGo2TBXIaxytlos/fJKteFS8aqzuuwzTZLWz9pnuRNd2LsnQvGnw+cU3C11VKcQfxCwAbRDDIzGCxmiTi0PAZebW8c4fPsCYVMTUCHwIOwvNrPZvoCrgB9fARs9TrrneFV4YyVpBlXWh7auFzBVr/GTazLK/ESyDmILHQudkynX+6e8rSa/Nies0vJtd+OMyBQQJa1x23yGwiaJUQBLpLSM08oDMtlqTf3ETeZZLOogaBYDRQGiVAIm8gR6CEy9P8w31ZHiouAmZAMpvFUe640mpfmfDU9nMNC54y/44LG+UKAqiwMZq48IbQkIaYSNrdAeEamoZ5mcNGiamIR0kQNVDiG6LU4AEAYUeJ7xwlR30vw9kegaGh6gSVLj1shOzarqUTsJPBGVcqcTD94sTw4xjiA4qTnDeOH48HbmYkEKHAmjLaxtfYr/StmWx3hdqAa4MGnLShNrhxo62SOFv0K33gIPrdnKsZpKM3R9EKCk1BpE6RKy9wWSGXpTN22Ao6Orb0ktmJJQF2lsJVEkbsEob3mV9yg9pF/DZ8G78az0Id66JZSQKe9dPBpbSJQnygPublH2UFKUmllU5yLmp6ugg1c050s1a6Jv1I7eiRLapaTVC6gmhQDb54owbfIelAd4D0lhI0Imayacjcj9tQmxIcHWNFipvaCxOnIgLsSO2xIjU6kolPDCz1Q0K5kisH9Q1hT+TK7oncwy6x4x370bvi+voSuxu56H1YnWwyrL4NQHYjj9gehtWPBCJqGVRH7tbkSWuhA4J9LBQorGc7Is+ZsPaecy+INXpwriAZSj5cmINytNZL6wUO97uJXGE4oEwPM5fgMEyQcGOodipSrZeBuYJtmKkeZmsv2iim3Z0Itk71OMNoYMdAmBP19cdADM1mtYxlnUHXe3kCGeUJgjHlUAwfrKb6hDOABtRSYTmQA0oh7IOyQzNcLfsn3MRZPY4UmuU+yohkArnCyJbHUxhBcOJmwfIrBvpEG037qUCHPD+DrfMzhALqLDfhyG33cM72NSMzBYAWz9F5EflQtmGYtYq6MaeNaxWuMFJELqbNahlWxSh7hlOMDryF2egE49hRGckVNACQ2l7lAh4Z4UpkgiNp0jNLRwxLMDjlpuhs14FXhCpLTnbVbqNonEdj2vkoNB6Nw1mknMaRfm3p8IdGvARxwJRYYUDNeobp1VFCqV8uziKl15nV/aamZeK0bvvYdu63G3+BZnBsw0h9TAMN1DOdMhY4SCGNYhXwtBE7xDOxE0Sap6dZHAqiHDpWdikEglY7RaVtYY2z/IMjxCRc5ouaWVY5dAvhIFOPh10sJO2LhVuKFbWDRDe3WFtXDsvAZU94yEfSQAM0UruOZctUhB00QB3FTpXj62QgHCAyoCNBza0fEBNJhydXmlQXp4BWJAyTQNJjOOTOPFmDQYKte5u3MWCOdCNd3/lfASh7ilMpD/S4T8OtIMxdWcMNKtnpntDJ6Z7MyemefcfFpighRKTcZIce348orQ2MFeWBXp2vTPwhJ/yIPeHHJGHcXVnDti5CI8M2Qoa0yfhVlFz2JKdcHE09Hrdf7LHXAyJdFOKPbrIXEW6epQYO7wyhVv6fI/QGPFdoDvgyqlcxHkJ/2VaDhc4qw/178ZYkB6SbefF7ysmvnd8teiHZQ3R24qObNPGu02g6e/3+1GahKAgwUEpvadyKuUIrSKScoEdScMmBdf7T3HQ6iNOPJ5eKNK0H1/JJ68HkLB7Fb/M7fI87Oeu9/22YEJgntTClKSXCzo57B4sRz6ok5V+y9pKkac1M0uRmFk2WWzHTNJrFt6GXfnPpyzNKrCtNs0c6RR2PSf75JL6alW3q+OVPK2X7ajeroRcLuMAB5ihHr9gI+Hz38u9yfzTFlSw8Rsh+8JriYyaslrSUJA5nQ3jH06xzQr0g/wn53ka8XG04iCqaMnvK7pXMAbsnhomjHGBuBXYr6Vy+4DY42MoxWdK/6r3RT9q99tlzIcZMj8C62G479Qorw79WAE+u3p75o2QGsL/6q8zNakiXbF2WqQKZPXH3PNdw4nXR/iz05GZ2UwOpNoy1FrOTvgXKK/JcBO859avSKGrIWM4fPtw/fGcDMxp74XWqPmtBjgpMp1OlBzSpRYCv05tx4l3eKErskQSQAYY8ACJPmElppDC9aRAGRVwFrOpaLKi1bxthc7hFEAbYcHCdXHqaSoWEySvf08aQ1bRZdQbn7K1X6uvPV5Hbhh64bncguTWEpMlT5ZWpYywxJi23OYGBiZyGpZFLBXnyvYz8nSA1YGeGmnMRUn9rewfRuS9TUZyU6ImTXSnONAi9K6XCp9mJWAs686McomIiBgWK3wHj+UwtLCZiQl2vUja35Ohgwat9eMrS2UeSOBdmJm1QIqpJ9Jp4pQNFtkMDx7Q3wpVwCS+6iMfxaJpMvGQU30axIk+LVymL/Xp7XrErLHGIJ7OyHJY9Ukolhwwx2kaTMj4oRar7FtpwKmtk3R1Y5+F1rGegi1FpbewAsYrwleWTeYSPG31NLMoFcQBZQLC9JwjD9o1ck+S2Nn6AsD5+2DqB5mFt9NZzak1zVmesdDO6Tg+sqhiRdx29/BQWpQmRgFIUEJI3sZLmbsj8YO9XzcchxdiW4JTMXMzBshN0hyJSisK8Y9/KpKxvRBFc15/aGZ4Btx+bI2WCOg3Pt8+vLNtYGdy+8fjz/Hn+8d3To/pRZP0fdbmy7j5I/0uJLKf46qYVh7ZN+UyyC5aaRK+OUwqjjNytlOTk5U+jeBp5l/H0PBwNC5hFpIaheSQ8dOofdkVnRWcTRBnNjiH6+rqQrCnYzqIOJAFiSDkZeXKSrqnPQSAWC3CKsTXBfqtTN4nsq1PclqbMhi8bYu467i0L3boP2Tlkg9qRQ1nbMwG2TzHL7VLM4GSDUHs9U6vJZZeQ9p3hMh39RRfYfgsFnVNcGdWOpe0insRvteMRTaeJXnIQXozVJeXshFntt5rE4gGUymnEeaID0HZHdEOh8701OX9z8RHEzjYPcCfZxzZsWjWb+J5+gFOMjw0oI78hBtFuskIKtUdqZcEEOD6BsjS9oiEFXsoVbI/Uyir5nn4Ml1gNZeiTIXNBPBZO/QywMKZmpxDELXxF4CMK6nxFRX3LadBq9RrjxRTbMXv80rm/KLbzF8lJo96s9fUL8iepc29/QK0HvH3rwb59/YY4jbtpR6iKZod+hHqw+53dofbZHchr1lztGeRs+1rNgoQWgzxVAL3Fkzn2Qq/TeByVFEX2BbtezX0VgHyFrQhYCSwrSoaXiSHmRPKh5PwVhVmbyBpOaPumCT+V3CUCgxqiF1wgYK3G7FtD0loNCUnNRH1VYrKHOWVOMx+D2S5sar76FoJ9eyawDjuR4bJ2rU8VyO07DZrCugHuqqXmmb+sLnWyQ4G06coN+WWgiFjgPofSdxskEmYmkpFB1UQnl5rKmjbIjFjXRbRhdFgZkkSEtG8H7AkYTeO6FquM5q3aVOvxGUZnlbkUi4lBZbRg+9YqTbrrwKrvwz8gaH/6x54R6nDuhyUoVg/lOgPS85IRQAJi9A8gyrBLR6K7gJGviKxZNLKgKEsQUxZg527DsHbgU2DO1QvCGBtMgKxJVGC03Hdf7OcOPCYCovc58h31y/U8ssZaV9B6GrVgXabTKq35YpcjTf2bPNp6UWdPYGYz+BuYv+pIWr6t0yV+v/wveOUwSmHGAAA=";

type RentalRow = {
  name: string; taxId: string; bank: string; agency: string; account: string;
  invoiceNumber: string; amountCents: number; referenceMonth: string | null;
  issueDate: string; entryDate: string; dueDate: string | null; purchaseOrder: string | null;
  description: string; paymentStatus: "paid" | "pending"; workflowStatus: string;
};

async function rentalRows(): Promise<RentalRow[]> {
  const normalized = RENTAL_DATA_GZIP_BASE64.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as RentalRow[];
}

const normalizedTaxId = (value: string | null | undefined) => (value || "").replace(/\D/g, "");
const stablePart = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export async function ensureSepcoRentalPayments(companyId: string, userId: string) {
  if (!companyId) return;
  const db = getDb();
  const [company] = await db.select({ taxId: companies.taxId }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (normalizedTaxId(company?.taxId) !== SEPCO_TAX_ID) return;
  const [marker] = await db.select({ id: masterData.id }).from(masterData).where(and(eq(masterData.companyId, companyId), eq(masterData.type, "sistema"), eq(masterData.name, IMPORT_MARKER))).limit(1);
  if (marker) return;

  const sourceRows = await rentalRows();
  const indexedRows = sourceRows.map((row, sourceIndex) => ({ row, sourceIndex }));
  const rows = indexedRows.filter(({ row }) => row.paymentStatus === "paid");
  const now = new Date().toISOString();
  const currentSuppliers = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
  const supplierByKey = new Map<string, { id: string }>();
  currentSuppliers.forEach((supplier) => {
    supplierByKey.set(normalizedTaxId(supplier.taxId) || stablePart(supplier.name), supplier);
  });

  const uniqueSuppliers = new Map<string, RentalRow>();
  sourceRows.forEach((row) => uniqueSuppliers.set(normalizedTaxId(row.taxId) || stablePart(row.name), row));
  const supplierOperations = [];
  for (const [key, row] of uniqueSuppliers) {
    const existing = supplierByKey.get(key);
    if (existing) {
      supplierOperations.push(db.update(suppliers).set({
        name: row.name, taxId: row.taxId || null, bank: row.bank || null,
        bankAgency: row.agency || null, bankAccount: row.account || null,
        accountHolder: row.name, paymentMethod: "Crédito em conta própria", active: true,
      }).where(and(eq(suppliers.id, existing.id), eq(suppliers.companyId, companyId))));
    } else {
      const id = `sepco-rental-supplier-${stablePart(companyId)}-${stablePart(key)}`;
      supplierByKey.set(key, { id });
      supplierOperations.push(db.insert(suppliers).values({
        id, companyId, name: row.name, taxId: row.taxId || null, bank: row.bank || null,
        bankAgency: row.agency || null, bankAccount: row.account || null,
        accountHolder: row.name, paymentMethod: "Crédito em conta própria", active: true,
      }).onConflictDoNothing());
    }
  }
  for (let index = 0; index < supplierOperations.length; index += 20) {
    await db.batch(supplierOperations.slice(index, index + 20) as [typeof supplierOperations[number], ...typeof supplierOperations[number][]]);
  }

  // Remove somente os registros que a importação anterior criou para notas ainda
  // em análise/aprovação. Os IDs são determinísticos e não atingem lançamentos manuais.
  const cleanupOperations = indexedRows.filter(({ row }) => row.paymentStatus !== "paid").flatMap(({ row, sourceIndex }) => {
    const rowKey = `${sourceIndex + 1}-${stablePart(row.invoiceNumber)}-${row.issueDate}`;
    const invoiceId = `sepco-rental-invoice-${stablePart(companyId)}-${rowKey}`;
    return [
      db.delete(fiscalInvoicePayments).where(and(eq(fiscalInvoicePayments.companyId, companyId), eq(fiscalInvoicePayments.invoiceId, invoiceId))),
      db.delete(fiscalInvoiceItems).where(and(eq(fiscalInvoiceItems.companyId, companyId), eq(fiscalInvoiceItems.invoiceId, invoiceId))),
      db.delete(fiscalInvoices).where(and(eq(fiscalInvoices.companyId, companyId), eq(fiscalInvoices.id, invoiceId))),
    ];
  });
  for (let index = 0; index < cleanupOperations.length; index += 24) {
    await db.batch(cleanupOperations.slice(index, index + 24) as [typeof cleanupOperations[number], ...typeof cleanupOperations[number][]]);
  }

  const invoiceOperations = rows.flatMap(({ row, sourceIndex }) => {
    const key = normalizedTaxId(row.taxId) || stablePart(row.name);
    const supplierId = supplierByKey.get(key)!.id;
    const rowKey = `${sourceIndex + 1}-${stablePart(row.invoiceNumber)}-${row.issueDate}`;
    const invoiceId = `sepco-rental-invoice-${stablePart(companyId)}-${rowKey}`;
    const invoiceStatus = row.paymentStatus === "paid" ? "approved" : "pending_review";
    const observation = [
      `Importado da planilha de conferência de pagamentos. Situação original: ${row.workflowStatus}.`,
      row.referenceMonth ? `Competência: ${row.referenceMonth}/2026.` : "",
      "A data de emissão não constava na planilha; foi utilizado o primeiro dia da competência somente como referência.",
      row.description,
    ].filter(Boolean).join(" ");
    return [
      db.insert(fiscalInvoices).values({
        id: invoiceId, companyId, supplierId, invoiceNumber: row.invoiceNumber,
        issueDate: row.issueDate, entryDate: row.entryDate, dueDate: row.dueDate,
        purchaseOrder: row.purchaseOrder, costCenter: "LOCAÇÃO DE EQUIPAMENTOS",
        totalCents: row.amountCents, status: invoiceStatus, accountingChecked: row.paymentStatus === "paid",
        pickedUp: false, stockUpdated: false, observation, createdBy: userId, createdAt: now,
      }).onConflictDoNothing(),
      db.insert(fiscalInvoiceItems).values({
        id: `${invoiceId}-item-1`, companyId, invoiceId, description: "LOCAÇÃO DE EQUIPAMENTOS",
        category: "LOCAÇÃO", quantityMilli: 1000, unitPriceCents: row.amountCents,
        totalCents: row.amountCents, stockEntry: false, createdAt: now,
      }).onConflictDoNothing(),
      db.insert(fiscalInvoicePayments).values({
        id: `${invoiceId}-payment-1`, companyId, invoiceId, installment: 1,
        amountCents: row.amountCents, dueDate: row.dueDate || row.entryDate,
        paymentMethod: "Crédito em conta própria", status: row.paymentStatus === "paid" ? "paid" : "payable",
      }).onConflictDoNothing(),
    ];
  });
  for (let index = 0; index < invoiceOperations.length; index += 24) {
    await db.batch(invoiceOperations.slice(index, index + 24) as [typeof invoiceOperations[number], ...typeof invoiceOperations[number][]]);
  }
  await db.insert(masterData).values({
    id: crypto.randomUUID(), companyId, type: "sistema", code: "IMPORT-LOCACAO-PAG-20261120",
    name: IMPORT_MARKER, description: `${uniqueSuppliers.size} fornecedores e ${rows.length} notas quitadas de locação importados; total R$ 4.091.317,79`,
    active: true, createdBy: userId, createdAt: now, updatedAt: now,
  });
}
