import { describe, it, expect } from "vitest";
import { createLead, getAllLeads } from "./db";

describe("Lead Capture", () => {
  describe("Lead Creation", () => {
    it("should create a lead with required fields", async () => {
      const leadData = {
        name: "John Doe",
        email: "john@example.com",
        company: "Acme Corp",
      };
      
      const result = await createLead(leadData);
      expect(result).toBeDefined();
    });

    it("should create a lead with optional game metadata", async () => {
      const leadData = {
        name: "Jane Smith",
        email: "jane@example.com",
        company: "Tech Inc",
        gameId: 1,
        score: 42,
        theme: "Products" as const,
        gridSize: "4x4" as const,
      };
      
      const result = await createLead(leadData);
      expect(result).toBeDefined();
    });
  });

  describe("Lead Retrieval", () => {
    it("should retrieve all leads", async () => {
      // Create a test lead first
      await createLead({
        name: "Test User",
        email: "test@example.com",
        company: "Test Company",
      });

      const leads = await getAllLeads();
      expect(Array.isArray(leads)).toBe(true);
      expect(leads.length).toBeGreaterThan(0);
    });

    it("should include all required fields in retrieved leads", async () => {
      const leadData = {
        name: "Complete Lead",
        email: "complete@example.com",
        company: "Complete Corp",
      };
      
      await createLead(leadData);
      const leads = await getAllLeads();
      
      const testLead = leads.find(l => l.email === "complete@example.com");
      expect(testLead).toBeDefined();
      expect(testLead?.name).toBe("Complete Lead");
      expect(testLead?.email).toBe("complete@example.com");
      expect(testLead?.company).toBe("Complete Corp");
    });
  });

  describe("Lead Data Validation", () => {
    it("should store game metadata when provided", async () => {
      const leadData = {
        name: "Gamer User",
        email: "gamer@example.com",
        company: "Gaming Co",
        gameId: 99,
        score: 85,
        theme: "Features" as const,
        gridSize: "6x6" as const,
      };
      
      await createLead(leadData);
      const leads = await getAllLeads();
      
      const gameLead = leads.find(l => l.email === "gamer@example.com");
      expect(gameLead?.score).toBe(85);
      expect(gameLead?.theme).toBe("Features");
      expect(gameLead?.gridSize).toBe("6x6");
    });

    it("should handle leads without game metadata", async () => {
      const leadData = {
        name: "Non-Gamer",
        email: "nongamer@example.com",
        company: "Non-Gaming Co",
      };
      
      const result = await createLead(leadData);
      expect(result).toBeDefined();
      
      const leads = await getAllLeads();
      const lead = leads.find(l => l.email === "nongamer@example.com");
      expect(lead).toBeDefined();
      expect(lead?.score).toBeNull();
      expect(lead?.theme).toBeNull();
    });
  });
});
