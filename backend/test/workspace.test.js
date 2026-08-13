import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { formatTenantTicket } from "../src/routes/workspace.js";

const tenantId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();

test("tenant ticket formatting removes internal notes and private author fields", () => {
    const ticket = formatTenantTicket({
        _id: new mongoose.Types.ObjectId(),
        ticketNumber: "TKT-000001",
        subject: "Publishing issue",
        description: "The site does not publish.",
        status: "in_progress",
        priority: "high",
        category: "Technical",
        replies: [
            {
                _id: new mongoose.Types.ObjectId(),
                author: { _id: adminId, name: "Support", role: "admin", email: "private@example.test" },
                content: "We are investigating.",
                isInternal: false,
                createdAt: new Date("2026-08-12T00:00:00.000Z"),
            },
            {
                _id: new mongoose.Types.ObjectId(),
                author: adminId,
                content: "Private diagnostic note.",
                isInternal: true,
                createdAt: new Date("2026-08-12T00:01:00.000Z"),
            },
            {
                _id: new mongoose.Types.ObjectId(),
                author: tenantId,
                content: "Thank you.",
                isInternal: false,
                createdAt: new Date("2026-08-12T00:02:00.000Z"),
            },
        ],
        createdAt: new Date("2026-08-12T00:00:00.000Z"),
        updatedAt: new Date("2026-08-12T00:02:00.000Z"),
    });

    assert.equal(ticket.replies.length, 2);
    assert.equal(ticket.replies.some((reply) => reply.content.includes("Private")), false);
    assert.deepEqual(ticket.replies[0].author, { id: adminId, name: "Support", role: "admin" });
    assert.deepEqual(ticket.replies[1].author, { id: tenantId });
});
