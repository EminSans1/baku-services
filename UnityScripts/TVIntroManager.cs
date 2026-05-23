using System;
using System.Collections;
using System.Reflection;
using UnityEngine;
using UnityEngine.SceneManagement;

public class TVIntroManager : MonoBehaviour
{
    [Header("Screen & Glitch Components")]
    [Tooltip("The TV_Glitch child GameObject that displays static noise/glitch overlay.")]
    [SerializeField] private GameObject tvGlitch;

    [Header("Audio Settings")]
    [Tooltip("Optional AudioSource component to play the glitch sound.")]
    [SerializeField] private AudioSource audioSource;
    [Tooltip("The audio clip of static noise played when the TV is clicked.")]
    [SerializeField] private AudioClip glitchSound;

    [Header("Click & Transition Settings")]
    [Tooltip("Cooldown in seconds to prevent spam-clicking the TV.")]
    [SerializeField] private float clickCooldown = 0.6f;
    [Tooltip("Name of the next scene to load after the intro is finished.")]
    [SerializeField] private string nextSceneName = "House1Scene";

    // News headlines sequence as requested
    private readonly string[] newsLines = new string[]
    {
        "BREAKING NEWS",
        "Earth has been invaded by aliens.",
        "They are rebuilding our cities.",
        "Humans are being transformed...",
        "Former samurai... take your katana."
    };

    private int currentLineIndex = -1;
    private float lastClickTime = -999f;
    
    // Components for Text UI
    private Component tmpTextComponent;
    private UnityEngine.UI.Text legacyTextComponent;
    private PropertyInfo textProperty;

    // Global state to prevent conflicts with random TVFlicker glitches
    public static bool IsGlitching { get; private set; }

    private void Awake()
    {
        IsGlitching = false;
        InitializeTextComponents();
    }

    private void Start()
    {
        // Ensure the glitch overlay is initially disabled
        if (tvGlitch != null)
        {
            tvGlitch.SetActive(false);
        }

        // Ensure the AudioSource is configured if available
        if (audioSource == null)
        {
            audioSource = GetComponent<AudioSource>();
        }

        // Initialize the screen with empty text as specified
        SetScreenText(string.Empty);
    }

    /// <summary>
    /// Detects clicks on the TV object. 
    /// Requires a BoxCollider2D (Is Trigger = true) on this GameObject.
    /// </summary>
    private void OnMouseDown()
    {
        HandleTVClick();
    }

    /// <summary>
    /// Core logic for handling clicks on the TV, includes debounce and scene loading.
    /// </summary>
    public void HandleTVClick()
    {
        // 1. Debounce check: prevent multiple clicks in rapid succession
        if (Time.time - lastClickTime < clickCooldown)
        {
            return;
        }
        lastClickTime = Time.time;

        // 2. Play glitch sound if present
        if (audioSource != null && glitchSound != null)
        {
            audioSource.PlayOneShot(glitchSound);
        }

        // 3. Trigger visual glitch transition
        StartCoroutine(TriggerGlitchTransition());

        // 4. Advance text index
        currentLineIndex++;

        if (currentLineIndex < newsLines.Length)
        {
            // Update to the next line of news
            SetScreenText(newsLines[currentLineIndex]);
        }
        else
        {
            // 5. Load the next scene after the final line has been read and clicked again
            LoadNextScene();
        }
    }

    /// <summary>
    /// Coroutine to toggle the glitch overlay for exactly 0.1 seconds.
    /// </summary>
    private IEnumerator TriggerGlitchTransition()
    {
        IsGlitching = true;
        if (tvGlitch != null)
        {
            tvGlitch.SetActive(true);
        }

        yield return new WaitForSeconds(0.1f);

        if (tvGlitch != null)
        {
            tvGlitch.SetActive(false);
        }
        IsGlitching = false;
    }

    /// <summary>
    /// Loads the target scene with validation check and ensuring Time.timeScale = 1.
    /// </summary>
    private void LoadNextScene()
    {
        // Ensure time scale is reset to 1 before loading next scene
        Time.timeScale = 1f;

        // Check if the scene is added to Build Settings
        if (Application.CanStreamedLevelBeLoaded(nextSceneName))
        {
            SceneManager.LoadScene(nextSceneName);
        }
        else
        {
            Debug.LogError($"[TVIntroManager] Scene '{nextSceneName}' was not found! " +
                           $"Please make sure it exists and is added to the Build Settings (File -> Build Settings).");
        }
    }

    /// <summary>
    /// Uses reflection to search all assemblies for TextMeshProUGUI.
    /// If not found, falls back to legacy UnityEngine.UI.Text.
    /// This avoids compile errors if the project does not have the TMPro package.
    /// </summary>
    private void InitializeTextComponents()
    {
        Type tmpType = FindTypeInAssemblies("TMPro.TextMeshProUGUI");
        if (tmpType == null)
        {
            // Fallback type check for TMPro.TextMeshPro (non-UGUI version) just in case
            tmpType = FindTypeInAssemblies("TMPro.TextMeshPro");
        }

        if (tmpType != null)
        {
            tmpTextComponent = GetComponentInChildren(tmpType);
        }

        if (tmpTextComponent != null)
        {
            textProperty = tmpType.GetProperty("text");
        }
        else
        {
            // Fallback to legacy UI Text
            legacyTextComponent = GetComponentInChildren<UnityEngine.UI.Text>();
            
            if (legacyTextComponent != null)
            {
                Debug.LogWarning("[TVIntroManager] TextMeshPro component was not found in children. " +
                                 "Using standard legacy UnityEngine.UI.Text instead.");
            }
            else
            {
                Debug.LogError("[TVIntroManager] Neither TextMeshProUGUI nor legacy UI.Text was found in children! " +
                               "Please add a Text component under the TV_Screen object.");
            }
        }
    }

    /// <summary>
    /// Helper method to set the screen text using either TextMeshPro (reflection) or legacy UI Text.
    /// </summary>
    private void SetScreenText(string text)
    {
        if (tmpTextComponent != null && textProperty != null)
        {
            textProperty.SetValue(tmpTextComponent, text, null);
        }
        else if (legacyTextComponent != null)
        {
            legacyTextComponent.text = text;
        }
    }

    /// <summary>
    /// Helper to find a class type by name in all currently loaded assemblies.
    /// </summary>
    private Type FindTypeInAssemblies(string fullName)
    {
        foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            Type type = assembly.GetType(fullName);
            if (type != null)
            {
                return type;
            }
        }
        return null;
    }
}
