using System.Collections;
using UnityEngine;

public class TVFlicker : MonoBehaviour
{
    [Header("Screen & Glitch Components")]
    [Tooltip("The SpriteRenderer component of the TV screen that will flicker.")]
    [SerializeField] private SpriteRenderer tvScreen;
    
    [Tooltip("The TV_Glitch child GameObject that displays static noise/glitch overlay.")]
    [SerializeField] private GameObject tvGlitch;

    [Header("Flicker Frequency")]
    [Tooltip("Minimum time in seconds between color changes.")]
    [SerializeField] private float minFlickerInterval = 0.05f;
    [Tooltip("Maximum time in seconds between color changes.")]
    [SerializeField] private float maxFlickerInterval = 0.20f;

    [Header("Glitch (Noise) Frequency")]
    [Tooltip("Probability (from 0 to 1) that a color change triggers a short noise glitch.")]
    [Range(0f, 1f)]
    [SerializeField] private float glitchChance = 0.15f;
    
    [Tooltip("Duration in seconds for the random noise glitch effect.")]
    [SerializeField] private float glitchDuration = 0.05f;

    // Hex colors as required:
    // #88FF88 (Normal green)
    // #448844 (Dark green)
    // #AAFFAA (Bright green)
    private Color normalColor;
    private Color darkColor;
    private Color brightColor;
    private Color[] flickerColors;

    private void Start()
    {
        InitializeColors();

        // Auto-assign SpriteRenderer from the local GameObject if not assigned
        if (tvScreen == null)
        {
            tvScreen = GetComponent<SpriteRenderer>();
        }

        if (tvScreen == null)
        {
            Debug.LogError("[TVFlicker] SpriteRenderer not found! Please attach this script to the TV_Screen object " +
                           "or manually assign the TV Screen field in the Inspector.");
            return;
        }

        // Start the flickering loop
        StartCoroutine(FlickerRoutine());
    }

    /// <summary>
    /// Parses Hex values to Color objects and fills the array.
    /// </summary>
    private void InitializeColors()
    {
        if (!ColorUtility.TryParseHtmlString("#88FF88", out normalColor))
        {
            normalColor = new Color(0.533f, 1f, 0.533f);
        }
        if (!ColorUtility.TryParseHtmlString("#448844", out darkColor))
        {
            darkColor = new Color(0.267f, 0.533f, 0.267f);
        }
        if (!ColorUtility.TryParseHtmlString("#AAFFAA", out brightColor))
        {
            brightColor = new Color(0.667f, 1f, 0.667f);
        }

        flickerColors = new Color[] { normalColor, darkColor, brightColor };
    }

    /// <summary>
    /// Background routine that continuously alters the color and triggers occasional random glitches.
    /// </summary>
    private IEnumerator FlickerRoutine()
    {
        while (true)
        {
            // 1. Randomly select and apply one of the three green shades
            if (tvScreen != null)
            {
                Color nextColor = flickerColors[Random.Range(0, flickerColors.Length)];
                tvScreen.color = nextColor;
            }

            // 2. Randomly trigger a glitch, but only if the user is not currently clicking the TV
            // (This prevents overlapping/competing glitch timer conflicts!)
            if (tvGlitch != null && !TVIntroManager.IsGlitching && Random.value < glitchChance)
            {
                StartCoroutine(TriggerRandomGlitch());
            }

            // 3. Wait for a random interval within the defined range
            float waitTime = Random.Range(minFlickerInterval, maxFlickerInterval);
            yield return new WaitForSeconds(waitTime);
        }
    }

    /// <summary>
    /// Coroutine to toggle a random short glitch.
    /// </summary>
    private IEnumerator TriggerRandomGlitch()
    {
        tvGlitch.SetActive(true);
        yield return new WaitForSeconds(glitchDuration);
        
        // Only deactivate if a manual user-click glitch hasn't taken over in the meantime
        if (!TVIntroManager.IsGlitching)
        {
            tvGlitch.SetActive(false);
        }
    }
}
