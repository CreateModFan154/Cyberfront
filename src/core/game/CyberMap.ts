/**
 * Cyber Warfare Map System
 * 
 * Instead of geographical territories, maps represent network topology.
 * Regions are cloud provider regions, ISP hubs, or internet exchange points.
 */

export enum CyberMapType {
  // Cloud provider networks
  AWS_GLOBAL = "aws_global",
  AZURE_REGIONS = "azure_regions",
  GCP_NETWORK = "gcp_network",
  
  // Internet infrastructure
  INTERNET_BACKBONE = "internet_backbone",
  DARKNET = "darknet",
  DECENTRALIZED_WEB = "decentralized_web",
  
  // Hybrid
  CORPORATE_NETWORK = "corporate_network",
  HYBRID_CLOUD = "hybrid_cloud",
}

export interface NetworkNode {
  id: number;
  name: string; // e.g., "us-east-1", "eu-west", "ap-southeast"
  tier: "edge" | "regional" | "core"; // Network tier
  bandwidth: number;
  computeCapacity: number;
  
  // Network topology
  connectedNodes: Set<number>; // Adjacent nodes
  latency: number; // Milliseconds, affects attack timing
}

export const MAP_TIERS: Record<string, NetworkNode> = {
  // Example AWS-inspired network
  "us-east-1": {
    id: 1,
    name: "US East (N. Virginia)",
    tier: "core",
    bandwidth: 1000,
    computeCapacity: 500,
    connectedNodes: new Set([2, 3]),
    latency: 1,
  },
  "us-west-2": {
    id: 2,
    name: "US West (Oregon)",
    tier: "core",
    bandwidth: 900,
    computeCapacity: 450,
    connectedNodes: new Set([1, 4]),
    latency: 5,
  },
  "eu-west-1": {
    id: 3,
    name: "EU West (Ireland)",
    tier: "core",
    bandwidth: 800,
    computeCapacity: 400,
    connectedNodes: new Set([1, 5]),
    latency: 15,
  },
};
