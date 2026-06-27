/** Default policy text — EN + AR for one-click fill in the wizard */
export const POLICY_TEMPLATES = {
  en: {
    cancellation: 'Free cancellation until 24 hours before check-in.',
    children: 'Children of all ages are welcome.',
    pet: 'Pets are not allowed.',
    smoking: 'Smoking is not allowed inside rooms.',
    extraBed: 'Extra beds are available on request.'
  },
  ar: {
    cancellation: 'إلغاء مجاني قبل 24 ساعة من موعد الوصول.',
    children: 'الأطفال من جميع الأعمار مرحب بهم.',
    pet: 'الحيوانات الأليفة غير مسموح بها.',
    smoking: 'التدخين غير مسموح داخل الغرف.',
    extraBed: 'الأسرة الإضافية متاحة عند الطلب.'
  }
};

export const POLICY_FIELDS = [
  { key: 'cancellation_policy', keyAr: 'cancellation_policy_ar', templateKey: 'cancellation', labelKey: 'cancellationPolicy' },
  { key: 'children_policy', keyAr: 'children_policy_ar', templateKey: 'children', labelKey: 'childrenPolicy' },
  { key: 'pet_policy', keyAr: 'pet_policy_ar', templateKey: 'pet', labelKey: 'petPolicy' },
  { key: 'smoking_policy', keyAr: 'smoking_policy_ar', templateKey: 'smoking', labelKey: 'smokingPolicy' },
  { key: 'extra_bed_policy', keyAr: 'extra_bed_policy_ar', templateKey: 'extraBed', labelKey: 'extraBedPolicy' }
];
