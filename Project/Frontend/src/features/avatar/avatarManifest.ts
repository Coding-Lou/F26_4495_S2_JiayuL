/**
 * The avatar asset manifest (FEATURE-005 section 25). This file is a mirror
 * of section 25.2, which is the source of truth: any difference between the
 * two is a defect in this file. FEATURE-012 section 14.7 amends it: the
 * avatar model is the versioned `avatar-base-ready-to-go.glb` and the schema
 * gains `avatar.readyClip`; `version` stays 1 (section 14.4).
 *
 * Plain data. It imports nothing from `three`, React, or a business feature,
 * so it can be imported anywhere without pulling in the 3D chunk.
 *
 * Only `features/avatar` reads the asset fields (model paths, node names,
 * slot names). Business components pass visual categories and read nothing
 * else from here but `gear`, the category to visual category mapping.
 */

/* ------------------------------------------------------------------ *
 * 25.1 Schema
 * ------------------------------------------------------------------ */

export type GearCategoryKey =
  | 'FOOTWEAR' | 'RAIN_GEAR' | 'WARM_LAYER' | 'WIND_LAYER' | 'TREKKING_POLES' | 'TRACTION'
  | 'HEADLAMP' | 'BACKPACK' | 'WATER' | 'FOOD' | 'SUN_PROTECTION';   // backend wire values, declared locally

export type VisualCategory =
  | 'BACKPACK' | 'RAIN_SHELL' | 'WARM_LAYER' | 'HIKING_BOOTS' | 'TREKKING_POLES' | 'HEADLAMP';

export type EquipmentSlot = 'HEAD' | 'TORSO_INNER' | 'TORSO_OUTER' | 'BACK' | 'HANDS' | 'FEET';
export type SlotNode = 'Slot_Head' | 'Slot_Back' | 'Slot_Hand_L' | 'Slot_Hand_R';

type Representation =
  | { kind: 'embedded-variant'; show: readonly string[] }            // nodes inside the avatar GLB
  | { kind: 'attached-model';
      model: string;                                                 // path under the public root
      attachments: readonly { node: string; slotNode: SlotNode }[];
      load: 'after-ready' | 'on-equip' };

export interface VisualEntry {
  slot: EquipmentSlot;
  layer: 1 | 2 | 3;                  // 1 worn, 2 outer shell, 3 carried over clothing
  representation: Representation;
  hide: readonly string[];           // nodes hidden while this category is equipped
}

export interface AvatarManifest {
  version: number;                   // bumped whenever any GLB changes; appended to model URLs as ?v=
  avatar: {
    model: string;
    rootNode: 'Avatar_Root';
    slotNodes: readonly SlotNode[];
    defaultHidden: readonly string[];
    requiredNodes: readonly string[];  // validated after load (section 34)
    idleClip: 'Idle' | null;
    /**
     * FEATURE-012 (spec 012 sections 10, 14.7): the one post-save clip, looked
     * up by exact name. Not a required node: a file without it is valid and
     * every Finish reaches the static completion.
     */
    readyClip: 'ready_to_go' | null;
  };
  gear: Record<GearCategoryKey, VisualCategory | null>;   // null = UI-only
  visuals: Record<VisualCategory, VisualEntry>;
}

/* ------------------------------------------------------------------ *
 * 25.2 Content
 * ------------------------------------------------------------------ */

export const avatarManifest = {
  version: 1,
  avatar: {
    // FEATURE-012 section 14.4: the versioned copy that adds `ready_to_go`.
    // Rollback is this one line, back to 'models/avatar/avatar-base.glb'.
    model: 'models/avatar/avatar-base-ready-to-go.glb',
    rootNode: 'Avatar_Root',
    slotNodes: ['Slot_Head', 'Slot_Back', 'Slot_Hand_L', 'Slot_Hand_R'],
    defaultHidden: ['Wear_WarmLayer_Body', 'Wear_WarmLayer_Collar', 'Wear_Shell', 'Wear_Boots'],
    requiredNodes: ['Avatar_Root', 'Avatar_Head', 'Avatar_Hair_Base', 'Avatar_Hair_Top', 'Avatar_Hands',
      'Avatar_Legs', 'Avatar_Top_Base', 'Avatar_Shoes_Default', 'Wear_WarmLayer_Body',
      'Wear_WarmLayer_Collar', 'Wear_Shell', 'Wear_Boots'],
    idleClip: 'Idle',
    readyClip: 'ready_to_go',
  },
  gear: {
    BACKPACK: 'BACKPACK', RAIN_GEAR: 'RAIN_SHELL', WARM_LAYER: 'WARM_LAYER', FOOTWEAR: 'HIKING_BOOTS',
    TREKKING_POLES: 'TREKKING_POLES', HEADLAMP: 'HEADLAMP',
    WIND_LAYER: null, TRACTION: null, WATER: null, FOOD: null, SUN_PROTECTION: null,
  },
  visuals: {
    WARM_LAYER:   { slot: 'TORSO_INNER', layer: 1, hide: ['Avatar_Top_Base'],
                    representation: { kind: 'embedded-variant', show: ['Wear_WarmLayer_Body', 'Wear_WarmLayer_Collar'] } },
    RAIN_SHELL:   { slot: 'TORSO_OUTER', layer: 2, hide: ['Avatar_Top_Base', 'Wear_WarmLayer_Body'],
                    representation: { kind: 'embedded-variant', show: ['Wear_Shell'] } },
    HIKING_BOOTS: { slot: 'FEET', layer: 1, hide: ['Avatar_Shoes_Default'],
                    representation: { kind: 'embedded-variant', show: ['Wear_Boots'] } },
    BACKPACK:     { slot: 'BACK', layer: 3, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-backpack.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_Backpack', slotNode: 'Slot_Back' }] } },
    TREKKING_POLES: { slot: 'HANDS', layer: 1, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-trekking-poles.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_TrekkingPole_L', slotNode: 'Slot_Hand_L' },
                                    { node: 'Gear_TrekkingPole_R', slotNode: 'Slot_Hand_R' }] } },
    HEADLAMP:     { slot: 'HEAD', layer: 1, hide: [],
                    representation: { kind: 'attached-model', model: 'models/gear/gear-headlamp.glb', load: 'after-ready',
                      attachments: [{ node: 'Gear_Headlamp', slotNode: 'Slot_Head' }] } },
  },
} as const satisfies AvatarManifest;
