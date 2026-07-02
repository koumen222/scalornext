import React from 'react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import PremiumProductPageGeneratorModal from '../components/PremiumProductPageGeneratorModal.jsx';

const PremiumProductPageGeneratorWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/ecom/boutique') ? '/ecom/boutique' : '/ecom/store';
  const returnTo = location.state?.from || `${basePath}/product-page-studio/generations`;
  const loadTaskId = location.state?.loadTaskId || null;

  const handleClose = () => {
    navigate(returnTo);
  };

  const handleApply = (productData) => {
    navigate(`${basePath}/products/new`, {
      state: {
        prefill: productData,
        fromGenerator: true,
      },
    });
  };

  return (
    <PremiumProductPageGeneratorModal
      onClose={handleClose}
      onApply={handleApply}
      pageMode
      initialTaskId={loadTaskId}
    />
  );
};

export default PremiumProductPageGeneratorWizard;
