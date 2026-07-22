/**
 * getStackSecurityNotes() 
 * Returns tailored security guidance based on detected technology stack.
 */
function getStackSecurityNotes(stack) {
    const notes = {
        // ... (Existing profiles: Next.js, Express, FastAPI, etc.)
        
        'spring-boot': [
            "**Focus:** Enterprise Java/Kotlin backend services.",
            "🔑 **Auth:** Leverage Spring Security; use `@PreAuthorize` for method-level access checks.",
            "🔐 **CSRF:** Always enable and respect CSRF token requirements for state changes.",
            "💾 **Data:** Use parameterized queries exclusively (Spring Data JPA) to prevent SQL injection.",
            "☁️ **Secrets:** Never hardcode secrets; integrate with dedicated vaults (e.g., HashiCorp Vault)."
        ],
    };

    if (notes[stack]) {
        return notes[stack].join('\n\n');
    }
    
    // ... (Fallback logic)
}