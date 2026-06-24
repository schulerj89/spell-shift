export const heroCharacterManifest = {
  id: "hero",
  displayName: "Hero Character Test Rig",
  baseAssetId: "idle-3",
  assets: [
    ["idle-3", "Idle 3", "base-animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Idle_3_withSkin.glb"],
    ["idle-6", "Idle 6", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Idle_6_withSkin.glb"],
    ["jump", "Regular Jump", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Regular_Jump_withSkin.glb"],
    ["roll-dodge-2", "Roll Dodge 2", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Roll_Dodge_2_withSkin.glb"],
    ["roll-dodge-3", "Roll Dodge 3", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Roll_Dodge_3_withSkin.glb"],
    ["run", "Running", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Running_withSkin.glb"],
    ["walk-in-place", "Walking 2 Inplace", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_walking_2_inplace_withSkin.glb"],
    ["walk", "Walking", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_Walking_withSkin.glb"],
    ["spell-cast", "Mage Spell Cast", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_withSkin.glb"],
    ["spell-cast-1", "Mage Spell Cast 1", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_1_withSkin.glb"],
    ["spell-cast-2", "Mage Spell Cast 2", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_2_withSkin.glb"],
    ["spell-cast-3", "Mage Spell Cast 3", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_3_withSkin.glb"],
    ["spell-cast-4", "Mage Spell Cast 4", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_4_withSkin.glb"],
    ["spell-cast-5", "Mage Spell Cast 5", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_5_withSkin.glb"],
    ["spell-cast-6", "Mage Spell Cast 6", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_6_withSkin.glb"],
    ["spell-cast-7", "Mage Spell Cast 7", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_7_withSkin.glb"],
    ["spell-cast-8", "Mage Spell Cast 8", "animation", "/assets/characters/hero/Meshy_AI_Athletic_Figure_in_Gr_biped/Meshy_AI_Athletic_Figure_in_Gr_biped_Animation_mage_soell_cast_8_withSkin.glb"]
  ].map(([id, label, type, url]) => ({ id, label, type, url }))
};

export function getBaseHeroAsset() {
  return heroCharacterManifest.assets.find((asset) => asset.id === heroCharacterManifest.baseAssetId);
}
