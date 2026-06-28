/**
 * Cyber Warfare Simulation Engine
 * 
 * Deterministic game loop for cyberwarfare RTS
 * Handles resource generation, unit deployment, attack resolution, and datacenter control
 */

import type { CyberGameState, CyberGameConfig } from "./CyberGameState";
import type { CyberIntent } from "./CyberIntents";
import type { CyberUnit } from "./CyberUnits";
import type { Datacenter } from "./Datacenters";
import { CYBER_UNIT_STATS } from "./CyberUnits";
import { calculateResourceGeneration } from "./CyberResources";
import { resolveCyberAttack } from "./CyberAttacks";

export class CyberSimulationEngine {
  private gameState: CyberGameState;
  private config: CyberGameConfig;

  constructor(gameState: CyberGameState, config: CyberGameConfig) {
    this.gameState = gameState;
    this.config = config;
  }

  /**
   * Execute one game tick
   */
  executeNextTick(intents: Array<CyberIntent & { playerID: string }>): void {
    // Phase 1: Generate resources
    this.generateResources();

    // Phase 2: Execute player intents
    for (const intent of intents) {
      this.executeIntent(intent);
    }

    // Phase 3: Process ongoing attacks
    this.processAttacks();

    // Phase 4: Update datacenter control
    this.updateDatacenterControl();

    // Phase 5: Apply maintenance costs
    this.applyMaintenanceCosts();

    // Phase 6: Update game statistics
    this.updatePlayerStats();

    this.gameState.currentTick++;
  }

  /**
   * Generate resources for each player from their datacenters
   */
  private generateResources(): void {
    for (const [playerID, datacenters] of this.getPlayerDatacenters()) {
      const dcArray = Array.from(datacenters.values());
      const generation = calculateResourceGeneration(dcArray);

      const resources = this.gameState.playerResources.get(playerID);
      if (resources) {
        resources.bandwidth += generation.bandwidthPerTick * this.config.bandwidthMultiplier;
        resources.computePower += generation.computePerTick * this.config.computeMultiplier;
        resources.intelligence += generation.intelligencePerTick * this.config.intelligenceMultiplier;
      }
    }
  }

  /**
   * Execute a single player intent
   */
  private executeIntent(intent: CyberIntent & { playerID: string }): void {
    const resources = this.gameState.playerResources.get(intent.playerID);
    if (!resources) return;

    switch (intent.type) {
      case "claim_datacenter":
        this.handleClaimDatacenter(intent, resources);
        break;
      case "deploy_unit":
        this.handleDeployUnit(intent, resources);
        break;
      case "launch_attack":
        this.handleLaunchAttack(intent, resources);
        break;
      case "upgrade_datacenter":
        this.handleUpgradeDatacenter(intent, resources);
        break;
      // Additional intents handled similarly
    }
  }

  private handleClaimDatacenter(
    intent: any,
    resources: any
  ): void {
    const dc = this.gameState.datacenters.get(intent.datacenterID);
    if (!dc || intent.resourcesCommitted > resources.bandwidth) return;

    resources.bandwidth -= intent.resourcesCommitted;
    
    // Claim progress
    if (!dc.ownerID) {
      dc.ownerID = intent.playerID;
      dc.claimedAtTick = this.gameState.currentTick;
    } else if (dc.ownerID !== intent.playerID) {
      // Attacking enemy datacenter - would convert with capture mechanics
      dc.ownerID = intent.playerID;
    }
  }

  private handleDeployUnit(
    intent: any,
    resources: any
  ): void {
    const dc = this.gameState.datacenters.get(intent.datacenterID);
    if (!dc || dc.ownerID !== intent.playerID) return;

    const stats = CYBER_UNIT_STATS[intent.unitType];
    if (resources.bandwidth < stats.buildCost) return;

    resources.bandwidth -= stats.buildCost;

    const unitID = this.generateUnitID();
    const unit: CyberUnit = {
      id: unitID,
      type: intent.unitType,
      ownerID: intent.playerID,
      datacenterID: intent.datacenterID,
      health: 100,
      maxHealth: 100,
      active: true,
      createdAtTick: this.gameState.currentTick,
    };

    this.gameState.cyberUnits.set(unitID, unit);
  }

  private handleLaunchAttack(
    intent: any,
    resources: any
  ): void {
    const unit = this.gameState.cyberUnits.get(intent.unitID);
    if (!unit || unit.ownerID !== intent.playerID || !unit.active) return;

    const targetDC = this.gameState.datacenters.get(intent.targetDatacenterID);
    if (!targetDC || targetDC.ownerID === intent.playerID) return;

    // Attack logic - simplified
    const attackID = `${intent.playerID}_${intent.unitID}_${this.gameState.currentTick}`;
    this.gameState.activeAttacks.set(attackID, {
      id: attackID,
      type: intent.attackType,
      attackerID: intent.playerID,
      defenderID: targetDC.ownerID!,
      sourceDatacenterID: unit.datacenterID,
      targetDatacenterID: intent.targetDatacenterID,
      unitID: intent.unitID,
      power: 50, // Simplified
      duration: 10,
      startedAtTick: this.gameState.currentTick,
      currentTick: this.gameState.currentTick,
      progress: 0,
      successChance: 0.6,
    });
  }

  private handleUpgradeDatacenter(
    intent: any,
    resources: any
  ): void {
    const dc = this.gameState.datacenters.get(intent.datacenterID);
    if (!dc || dc.ownerID !== intent.playerID) return;

    const upgradeCost = 1000; // Simplified
    if (resources.bandwidth < upgradeCost) return;

    resources.bandwidth -= upgradeCost;

    switch (intent.upgradeType) {
      case "bandwidth":
        dc.bandwidth *= 1.2;
        break;
      case "compute":
        dc.computeCapacity *= 1.2;
        break;
      case "defense":
        dc.inboundDDoSThreshold *= 1.3;
        break;
    }
  }

  /**
   * Process all active attacks
   */
  private processAttacks(): void {
    for (const [attackID, attack] of this.gameState.activeAttacks) {
      attack.currentTick++;
      attack.progress = attack.currentTick / attack.duration;

      if (attack.progress >= 1) {
        const result = resolveCyberAttack(attack);
        this.gameState.activeAttacks.delete(attackID);
      }
    }
  }

  /**
   * Update datacenter control based on ongoing pressure
   */
  private updateDatacenterControl(): void {
    // Simplified: datacenters stay controlled; in full impl would handle capture mechanics
  }

  /**
   * Apply maintenance costs
   */
  private applyMaintenanceCosts(): void {
    for (const [playerID, units] of this.getPlayerUnits()) {
      let totalMaintenance = 0;
      for (const unit of units.values()) {
        const stats = CYBER_UNIT_STATS[unit.type];
        totalMaintenance += stats.maintenanceCost;
      }

      const resources = this.gameState.playerResources.get(playerID);
      if (resources) {
        resources.bandwidth -= totalMaintenance;
      }
    }
  }

  /**
   * Update player statistics
   */
  private updatePlayerStats(): void {
    for (const playerID of this.gameState.playerResources.keys()) {
      const stats = this.gameState.playerStats.get(playerID) || {
        playerID,
        datacentersControlled: 0,
        unitsDeployed: 0,
        successfulAttacks: 0,
        defensesBlocked: 0,
        intelligenceGathered: 0,
        allianceMembers: 0,
        totalResourcesGenerated: 0,
      };

      stats.datacentersControlled = Array.from(this.gameState.datacenters.values()).filter(
        (dc) => dc.ownerID === playerID
      ).length;

      stats.unitsDeployed = Array.from(this.gameState.cyberUnits.values()).filter(
        (unit) => unit.ownerID === playerID && unit.active
      ).length;

      this.gameState.playerStats.set(playerID, stats);
    }
  }

  private getPlayerDatacenters(): Map<string, Map<number, Datacenter>> {
    const result = new Map<string, Map<number, Datacenter>>();
    for (const [id, dc] of this.gameState.datacenters) {
      if (dc.ownerID) {
        if (!result.has(dc.ownerID)) {
          result.set(dc.ownerID, new Map());
        }
        result.get(dc.ownerID)!.set(id, dc);
      }
    }
    return result;
  }

  private getPlayerUnits(): Map<string, Map<number, CyberUnit>> {
    const result = new Map<string, Map<number, CyberUnit>>();
    for (const [id, unit] of this.gameState.cyberUnits) {
      if (!result.has(unit.ownerID)) {
        result.set(unit.ownerID, new Map());
      }
      result.get(unit.ownerID)!.set(id, unit);
    }
    return result;
  }

  private generateUnitID(): number {
    return Math.max(...Array.from(this.gameState.cyberUnits.keys()), 0) + 1;
  }
}
