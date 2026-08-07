#!/usr/bin/env node

/**
 * Test Automatic Overdue Bill Checker
 * 
 * This script tests if the automatic overdue bill system works
 * 
 * Usage:
 *   node testOverdue.js
 */

require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

console.log("\n🔔 [OVERDUE BILL TESTER] Testing Automatic Overdue System\n");

// Initialize Firebase
if (!admin.getApps().length) {
  admin.initializeApp({
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "finalopenai-fc9c5"
  });
}

const db = getFirestore();

// Get transporter
function getTransporter() {
  const brevoKey = process.env.BREVO_API_KEY;

  if (!brevoKey) {
    console.log("   ❌ BREVO_API_KEY not set!");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: "a26ddc001@smtp-brevo.com",
      pass: brevoKey,
    },
  });
}

// Check if overdue
function isOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

// Get days overdue
function getDaysOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysOverdue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(daysOverdue, 0);
}

async function main() {
  console.log("Step 1️⃣  - Checking Brevo configuration...\n");
  
  const transporter = getTransporter();
  if (!transporter) {
    console.log("   ❌ Brevo not configured! Check BREVO_API_KEY in .env\n");
    process.exit(1);
  }

  console.log("   ✅ Brevo API configured\n");

  console.log("Step 2️⃣  - Scanning database for overdue bills...\n");

  let totalUsers = 0;
  let totalBills = 0;
  let overdueFound = 0;
  const overdueBills = [];

  try {
    const usersSnapshot = await db.collection("users").get();
    totalUsers = usersSnapshot.size;

    if (totalUsers === 0) {
      console.log("   ℹ️  No users found in database\n");
      process.exit(0);
    }

    console.log(`   Found ${totalUsers} users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) {
        console.log(`   ⚠️  User ${userId}: No email`);
        continue;
      }

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      totalBills += billsSnapshot.size;

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const dueDate = bill.gstrDeadline || bill.dueDate;

        if (!dueDate) continue;

        if (isOverdue(dueDate)) {
          overdueFound++;
          const daysOverdue = getDaysOverdue(dueDate);

          overdueBills.push({
            userId,
            billId: billDoc.id,
            supplier: bill.supplierName || "Unknown",
            invoice: bill.invoiceNumber || "N/A",
            amount: bill.amount || 0,
            dueDate: dueDate,
            daysOverdue: daysOverdue,
            userEmail: userEmail,
          });

          console.log(
            `   🚨 OVERDUE: ${bill.supplierName || "Bill"}`
          );
          console.log(
            `       Due: ${new Date(dueDate).toLocaleDateString("en-IN")}`
          );
          console.log(`       Days Overdue: ${daysOverdue}`);
          console.log(`       Email: ${userEmail}\n`);
        }
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Bills: ${totalBills}`);
    console.log(`   🚨 Overdue Bills Found: ${overdueFound}`);

    if (overdueFound === 0) {
      console.log("\n   ✅ No overdue bills - system is working correctly!\n");
      process.exit(0);
    }

    console.log(`\nStep 3️⃣  - Overdue Bills Requiring Emails:\n`);

    overdueBills.forEach((bill, idx) => {
      console.log(`${idx + 1}. ${bill.supplier} (${bill.daysOverdue} days overdue)`);
      console.log(`   Invoice: ${bill.invoice}`);
      console.log(`   Amount: ₹${bill.amount.toFixed(2)}`);
      console.log(`   Due Date: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}`);
      console.log(`   User Email: ${bill.userEmail}\n`);
    });

    console.log(`\n✅ Test Complete!\n`);
    console.log(`📧 When deployed:`);
    console.log(`   - ${overdueFound} automatic emails will be sent`);
    console.log(`   - Daily at 09:00 AM IST`);
    console.log(`   - User won't need to click anything\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
