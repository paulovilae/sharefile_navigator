import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom hook to manage browser history for workflow navigation
 * This ensures that the browser back button works correctly within the workflow
 */
const useBrowserHistory = (currentStep, setCurrentStep, workflowSteps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Update URL when step changes
  const updateUrl = useCallback((stepIndex) => {
    const step = workflowSteps[stepIndex];
    if (step) {
      const newUrl = `${location.pathname}?step=${stepIndex}&stepId=${step.id}`;
      // Use replace to avoid creating too many history entries
      window.history.replaceState(
        { step: stepIndex, stepId: step.id },
        '',
        newUrl
      );
    }
  }, [location.pathname, workflowSteps]);

  // Handle browser back/forward navigation
  const handlePopState = useCallback((event) => {
    if (event.state && typeof event.state.step === 'number') {
      const stepIndex = event.state.step;
      if (stepIndex >= 0 && stepIndex < workflowSteps.length) {
        setCurrentStep(stepIndex);
      }
    } else {
      // If no state, try to parse from URL
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');
      if (stepParam !== null) {
        const stepIndex = parseInt(stepParam, 10);
        if (!isNaN(stepIndex) && stepIndex >= 0 && stepIndex < workflowSteps.length) {
          setCurrentStep(stepIndex);
        }
      }
    }
  }, [setCurrentStep, workflowSteps.length]);

  // Initialize from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const stepParam = urlParams.get('step');
    if (stepParam !== null) {
      const stepIndex = parseInt(stepParam, 10);
      if (!isNaN(stepIndex) && stepIndex >= 0 && stepIndex < workflowSteps.length) {
        setCurrentStep(stepIndex);
      }
    } else {
      // If no step in URL, update URL with current step
      updateUrl(currentStep);
    }
  }, [location.search, workflowSteps.length, setCurrentStep, currentStep, updateUrl]);

  // Update URL when current step changes
  useEffect(() => {
    updateUrl(currentStep);
  }, [currentStep, updateUrl]);

  // Add popstate listener
  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handlePopState]);

  // Function to navigate to a specific step with proper history management
  const navigateToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < workflowSteps.length) {
      const step = workflowSteps[stepIndex];
      const newUrl = `${location.pathname}?step=${stepIndex}&stepId=${step.id}`;
      
      // Push new state to history
      window.history.pushState(
        { step: stepIndex, stepId: step.id },
        '',
        newUrl
      );
      
      setCurrentStep(stepIndex);
    }
  }, [location.pathname, workflowSteps, setCurrentStep]);

  // Function to go back to previous step
  const goBack = useCallback(() => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1);
    } else {
      // If at first step, go back to previous page
      window.history.back();
    }
  }, [currentStep, navigateToStep]);

  return {
    navigateToStep,
    goBack,
    currentUrl: `${location.pathname}?step=${currentStep}&stepId=${workflowSteps[currentStep]?.id || ''}`
  };
};

export default useBrowserHistory;