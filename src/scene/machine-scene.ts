// ---------------------------------------------------------------------------
// The machine: ported from Agentic Factory 3D (github.com/eugeneshilow/agentic-3d-templates,
// built by OpenAI Codex, React port by Claude). This version takes a factory definition, so one
// machine shape serves five product lines (accent, painted screens, station names and one
// signature prop change per line), and it builds one plate per product: every product the
// player owns stands as its own plate beside the others, and a new one rises when it is bought.
// It reads the game state every frame through `live`: each plate's speed drives its clock, the
