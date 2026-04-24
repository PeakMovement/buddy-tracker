const RED_FLAG_KEYWORDS = [
  { keyword: 'heart attack', score: 10, next_step: 'Call emergency services immediately.' },
  { keyword: 'stroke', score: 10, next_step: 'Call emergency services immediately.' },
  { keyword: 'cauda equina', score: 10, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'paralysis', score: 10, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'thunderclap headache', score: 10, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'suicidal', score: 10, next_step: 'Please reach out to a mental health crisis line or emergency services immediately.' },
  { keyword: 'anaphylaxis', score: 10, next_step: 'Use EpiPen if available and call emergency services immediately.' },
  { keyword: 'severe allergic reaction', score: 10, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'cannot breathe', score: 10, next_step: 'Call emergency services immediately.' },
  { keyword: 'choking', score: 10, next_step: 'Get immediate help or call emergency services.' },
  { keyword: 'chest pain', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'chest tightness', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'chest pressure', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'difficulty breathing', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'loss of bladder', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'bladder control', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'loss of bowel', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'bowel control', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'saddle anaesthesia', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'saddle anesthesia', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'worst headache', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'loss of consciousness', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'seizure', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'vision loss', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'slurred speech', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'facial drooping', score: 9, next_step: 'Seek emergency medical attention immediately — possible stroke.' },
  { keyword: 'coughing blood', score: 9, next_step: 'Seek urgent medical attention.' },
  { keyword: 'vomiting blood', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'self harm', score: 9, next_step: 'Please contact a mental health professional or crisis service immediately.' },
  { keyword: 'self-harm', score: 9, next_step: 'Please contact a mental health professional or crisis service immediately.' },
  { keyword: 'want to die', score: 9, next_step: 'Please reach out to a mental health crisis line or emergency services immediately.' },
  { keyword: 'severe shortness of breath', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'crushing chest pain', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'sudden severe headache', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'unconscious', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'severe bleeding', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'massive bleeding', score: 9, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'shortness of breath', score: 8, next_step: 'Seek urgent medical attention.' },
  { keyword: 'numbness in arm', score: 8, next_step: 'Consult a medical professional urgently.' },
  { keyword: 'arm numbness', score: 8, next_step: 'Consult a medical professional urgently.' },
  { keyword: 'urinary incontinence', score: 8, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'fever with back pain', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'fever with neck pain', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'car accident', score: 8, next_step: 'Seek medical evaluation promptly.' },
  { keyword: 'severe headache', score: 8, next_step: 'Seek medical advice promptly.' },
  { keyword: 'sudden headache', score: 8, next_step: 'Seek medical attention promptly.' },
  { keyword: 'fainting', score: 8, next_step: 'Seek medical attention promptly.' },
  { keyword: 'blackout', score: 8, next_step: 'Seek medical attention promptly.' },
  { keyword: 'speech difficulty', score: 8, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'blood in urine', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'blood in stool', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'severe abdominal pain', score: 8, next_step: 'Seek urgent medical attention.' },
  { keyword: 'unable to move', score: 8, next_step: 'Seek medical evaluation promptly.' },
  { keyword: 'cannot move', score: 8, next_step: 'Seek medical evaluation promptly.' },
  { keyword: 'tumor', score: 8, next_step: 'Consult your healthcare provider promptly.' },
  { keyword: 'tumour', score: 8, next_step: 'Consult your healthcare provider promptly.' },
  { keyword: 'sudden vision loss', score: 8, next_step: 'Seek emergency medical attention immediately.' },
  { keyword: 'sudden hearing loss', score: 8, next_step: 'Seek urgent medical attention.' },
  { keyword: 'severe dizziness', score: 8, next_step: 'Seek medical attention promptly.' },
  { keyword: 'severe vertigo', score: 8, next_step: 'Seek medical attention promptly.' },
  { keyword: 'high fever', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'fever over 39', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'fever above 102', score: 8, next_step: 'See a doctor urgently.' },
  { keyword: 'severe burn', score: 8, next_step: 'Seek urgent medical attention.' },
  { keyword: 'third degree burn', score: 8, next_step: 'Seek urgent medical attention.' },
  { keyword: 'concussion', score: 8, next_step: 'Seek immediate medical evaluation for head injury.' },
  { keyword: 'head injury', score: 8, next_step: 'Seek immediate medical evaluation for head injury.' },
  { keyword: 'fracture', score: 8, next_step: 'Seek immediate medical attention for suspected fracture.' },
  { keyword: 'broken bone', score: 8, next_step: 'Seek immediate medical attention for suspected fracture.' },
  { keyword: 'dislocation', score: 8, next_step: 'Seek immediate medical attention for dislocation.' },
  { keyword: 'dislocated', score: 8, next_step: 'Seek immediate medical attention for dislocation.' },
  { keyword: 'asthma attack', score: 8, next_step: 'Use rescue inhaler and seek immediate medical attention.' },
  { keyword: 'chest heaviness', score: 8, next_step: 'Seek medical attention for chest symptoms.' },
  { keyword: 'numbness in leg', score: 7, next_step: 'Consult a medical professional urgently.' },
  { keyword: 'leg numbness', score: 7, next_step: 'Consult a medical professional urgently.' },
  { keyword: 'unexplained weight loss', score: 7, next_step: 'See a doctor for further investigation.' },
  { keyword: 'sudden weight loss', score: 7, next_step: 'See a doctor for further investigation.' },
  { keyword: 'trauma', score: 7, next_step: 'Consult a physiotherapist or doctor.' },
  { keyword: 'fall injury', score: 7, next_step: 'Consult a physiotherapist or doctor.' },
  { keyword: 'loss of balance', score: 7, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'difficulty walking', score: 7, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'loss of coordination', score: 7, next_step: 'Seek medical advice promptly.' },
  { keyword: 'blurred vision', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'double vision', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'weakness in arm', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'weakness in leg', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'lump', score: 7, next_step: 'Have any new lumps assessed by a healthcare provider.' },
  { keyword: 'new lump', score: 7, next_step: 'Have any new lumps assessed by a healthcare provider.' },
  { keyword: 'deep bone pain', score: 7, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'spinal cord', score: 7, next_step: 'Seek urgent medical evaluation.' },
  { keyword: 'persistent vomiting', score: 7, next_step: 'Seek medical attention.' },
  { keyword: 'jaw pain', score: 7, next_step: 'Consult a healthcare provider — may indicate cardiac issues.' },
  { keyword: 'sudden jaw pain', score: 7, next_step: 'Consult a healthcare provider — may indicate cardiac issues.' },
  { keyword: 'persistent fever', score: 7, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'fever lasting days', score: 7, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'night sweats', score: 7, next_step: 'Schedule a medical consultation.' },
  { keyword: 'unexplained night sweats', score: 7, next_step: 'Schedule a medical consultation.' },
  { keyword: 'sudden severe pain', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'excruciating pain', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'unbearable pain', score: 7, next_step: 'Seek medical attention promptly.' },
  { keyword: 'torn ligament', score: 7, next_step: 'Consult a sports medicine professional or orthopedic specialist.' },
  { keyword: 'ligament tear', score: 7, next_step: 'Consult a sports medicine professional or orthopedic specialist.' },
  { keyword: 'meniscus tear', score: 7, next_step: 'Consult an orthopedic specialist promptly.' },
  { keyword: 'acl', score: 7, next_step: 'Consult an orthopedic specialist immediately.' },
  { keyword: 'pcl', score: 7, next_step: 'Consult an orthopedic specialist.' },
  { keyword: 'whiplash', score: 7, next_step: 'Seek medical evaluation following neck injury.' },
  { keyword: 'herniated disc', score: 7, next_step: 'Consult a spinal specialist or physiotherapist.' },
  { keyword: 'slipped disc', score: 7, next_step: 'Consult a spinal specialist or physiotherapist.' },
  { keyword: 'chest discomfort', score: 7, next_step: 'Consult a healthcare provider about chest symptoms.' },
  { keyword: 'irregular heartbeat', score: 7, next_step: 'Consult a healthcare provider about heart rhythm.' },
  { keyword: "can't catch breath", score: 7, next_step: 'Seek medical attention for breathing difficulties.' },
  { keyword: 'mole changes', score: 7, next_step: 'Have mole changes assessed promptly by a dermatologist.' },
  { keyword: 'suspicious mole', score: 7, next_step: 'Have suspicious moles assessed promptly by a dermatologist.' },
  { keyword: 'cancer', score: 9, next_step: 'Consult your oncologist or healthcare provider immediately.' },
  { keyword: 'rapid weight loss', score: 6, next_step: 'See a doctor for further investigation.' },
  { keyword: 'cold sweats', score: 6, next_step: 'Schedule a medical consultation.' },
  { keyword: 'profuse sweating', score: 6, next_step: 'Schedule a medical consultation.' },
  { keyword: 'radiating pain', score: 6, next_step: 'Book an appointment with your physiotherapist.' },
  { keyword: 'pain radiating', score: 6, next_step: 'Book an appointment with your physiotherapist.' },
  { keyword: 'pain shooting', score: 6, next_step: 'Book an appointment with your physiotherapist.' },
  { keyword: 'shooting pain', score: 6, next_step: 'Book an appointment with your physiotherapist.' },
  { keyword: 'stabbing pain', score: 6, next_step: 'Monitor closely and consult if worsening.' },
  { keyword: 'dizziness', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'vertigo', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'muscle weakness', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'significant swelling', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'redness and swelling', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'warmth and swelling', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'pain at night', score: 6, next_step: 'Schedule a consultation with your healthcare provider.' },
  { keyword: 'night pain', score: 6, next_step: 'Schedule a consultation with your healthcare provider.' },
  { keyword: 'waking pain', score: 6, next_step: 'Schedule a consultation with your healthcare provider.' },
  { keyword: 'bone pain', score: 6, next_step: 'Consult a healthcare provider if unexplained.' },
  { keyword: 'disc herniation', score: 6, next_step: 'Consult a physiotherapist or spinal specialist.' },
  { keyword: 'bulging disc', score: 6, next_step: 'Consult a physiotherapist or spinal specialist.' },
  { keyword: 'nerve compression', score: 6, next_step: 'Consult a physiotherapist or doctor.' },
  { keyword: 'severe nausea', score: 6, next_step: 'Consult a healthcare provider if persistent.' },
  { keyword: 'extreme fatigue', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'sudden fatigue', score: 6, next_step: 'Consult a healthcare provider.' },
  { keyword: 'neck stiffness', score: 6, next_step: 'Consult a healthcare provider, especially if with fever.' },
  { keyword: 'stiff neck', score: 6, next_step: 'Consult a healthcare provider, especially if with fever.' },
  { keyword: 'spreading rash', score: 6, next_step: 'Seek medical attention for spreading rashes.' },
  { keyword: 'hopeless', score: 6, next_step: 'Please speak with your healthcare provider or a mental health professional.' },
  { keyword: 'numbness', score: 6, next_step: 'Consult a healthcare provider if numbness persists.' },
  { keyword: 'burning pain', score: 6, next_step: 'Consult a healthcare provider for burning pain.' },
  { keyword: 'weakness', score: 6, next_step: 'Consult a healthcare provider about muscle weakness.' },
  { keyword: 'persistent headache', score: 6, next_step: 'Consult a healthcare provider about persistent headaches.' },
  { keyword: 'frequent headaches', score: 6, next_step: 'Consult a healthcare provider about frequent headaches.' },
  { keyword: 'recurring headache', score: 6, next_step: 'Consult a healthcare provider about recurring headaches.' },
  { keyword: 'persistent cough', score: 6, next_step: 'Consult a healthcare provider about persistent cough.' },
  { keyword: 'chronic cough', score: 6, next_step: 'Consult a healthcare provider about chronic cough.' },
  { keyword: 'joint swelling', score: 6, next_step: 'Consult a healthcare provider about joint swelling.' },
  { keyword: 'severe joint pain', score: 6, next_step: 'Consult a healthcare provider promptly.' },
  { keyword: 'rotator cuff', score: 6, next_step: 'Consult a physiotherapist or sports medicine professional.' },
  { keyword: 'mcl', score: 6, next_step: 'Consult a sports medicine professional.' },
  { keyword: 'achilles', score: 6, next_step: 'Consult a physiotherapist or sports medicine professional.' },
  { keyword: 'carpal tunnel', score: 6, next_step: 'Consult a healthcare provider about carpal tunnel syndrome.' },
  { keyword: 'pinched nerve', score: 6, next_step: 'Consult a physiotherapist or neurologist.' },
  { keyword: 'trapped nerve', score: 6, next_step: 'Consult a physiotherapist or neurologist.' },
  { keyword: 'wheezing', score: 6, next_step: 'Consult a healthcare provider about breathing difficulties.' },
  { keyword: 'tight chest', score: 6, next_step: 'Consult a healthcare provider about chest tightness.' },
  { keyword: 'shallow breathing', score: 6, next_step: 'Consult a healthcare provider about breathing pattern.' },
  { keyword: 'rapid breathing', score: 6, next_step: 'Consult a healthcare provider about breathing changes.' },
  { keyword: 'rapid heartbeat', score: 6, next_step: 'Monitor and consult if persistent or concerning.' },
  { keyword: 'racing heart', score: 6, next_step: 'Monitor and consult if persistent or concerning.' },
  { keyword: 'palpitations', score: 6, next_step: 'Monitor and consult if frequent or concerning.' },
  { keyword: 'heart pounding', score: 6, next_step: 'Monitor and consult if frequent or severe.' },
  { keyword: 'heart skipping', score: 6, next_step: 'Monitor and consult if frequent.' },
  { keyword: 'vomiting', score: 6, next_step: 'Monitor and seek medical attention if persistent.' },
  { keyword: 'panic', score: 6, next_step: 'Consider speaking with a mental health professional.' },
  { keyword: 'panic attack', score: 6, next_step: 'Consider speaking with a mental health professional.' },
  { keyword: 'depression', score: 6, next_step: 'Please speak with a mental health professional.' },
  { keyword: 'depressed', score: 6, next_step: 'Please speak with a mental health professional.' },
  { keyword: 'skin lesion', score: 6, next_step: 'Have skin lesions assessed by a healthcare provider.' },
  { keyword: 'tingling', score: 5, next_step: 'Monitor and consult if persistent.' },
  { keyword: 'pins and needles', score: 5, next_step: 'Monitor and consult if persistent.' },
  { keyword: 'burning sensation', score: 5, next_step: 'Monitor and consult if persistent.' },
  { keyword: 'sharp pain', score: 5, next_step: 'Monitor and consult if not improving.' },
  { keyword: 'migraine', score: 5, next_step: 'Consult your healthcare provider about management.' },
  { keyword: 'swelling', score: 5, next_step: 'Monitor and consult if persistent or worsening.' },
  { keyword: 'abdominal pain', score: 5, next_step: 'Consult a healthcare provider if persistent.' },
  { keyword: 'constant pain', score: 5, next_step: 'Consult your healthcare provider.' },
  { keyword: 'sciatica', score: 5, next_step: 'Consult a physiotherapist or doctor.' },
  { keyword: 'rash', score: 5, next_step: 'Have unexplained rashes assessed by a healthcare provider.' },
  { keyword: 'pain', score: 5, next_step: 'Monitor pain and consult if it worsens or persists.' },
  { keyword: 'burning', score: 5, next_step: 'Monitor burning sensation and consult if persistent.' },
  { keyword: 'leg pain', score: 5, next_step: 'Monitor leg pain and consult if it worsens.' },
  { keyword: 'back pain', score: 5, next_step: 'Monitor back pain and consult if it persists.' },
  { keyword: 'neck pain', score: 5, next_step: 'Monitor neck pain and consult if it persists.' },
  { keyword: 'arm pain', score: 5, next_step: 'Monitor arm pain and consult if it persists.' },
  { keyword: 'headache', score: 5, next_step: 'Monitor headache and consult if frequent or severe.' },
  { keyword: 'nausea', score: 5, next_step: 'Monitor nausea and consult if persistent.' },
  { keyword: 'fatigue', score: 5, next_step: 'Monitor fatigue and consult if unexplained or severe.' },
  { keyword: 'stiffness', score: 5, next_step: 'Monitor stiffness and consult if limiting function.' },
  { keyword: 'knee pain', score: 5, next_step: 'Monitor knee pain and consult if it persists.' },
  { keyword: 'shoulder pain', score: 5, next_step: 'Monitor shoulder pain and consult if it persists.' },
  { keyword: 'hip pain', score: 5, next_step: 'Monitor hip pain and consult if it persists.' },
  { keyword: 'ankle pain', score: 5, next_step: 'Monitor ankle pain and consult if it persists.' },
  { keyword: 'wrist pain', score: 5, next_step: 'Monitor wrist pain and consult if it persists.' },
  { keyword: 'elbow pain', score: 5, next_step: 'Monitor elbow pain and consult if it persists.' },
  { keyword: 'muscle pain', score: 5, next_step: 'Monitor muscle pain and consult if it persists.' },
  { keyword: 'joint pain', score: 5, next_step: 'Monitor joint pain and consult if it persists.' },
  { keyword: 'ache', score: 5, next_step: 'Monitor aches and consult if they persist.' },
  { keyword: 'aching', score: 5, next_step: 'Monitor aching and consult if it persists.' },
  { keyword: 'soreness', score: 5, next_step: 'Monitor soreness and consult if it persists.' },
  { keyword: 'sore', score: 5, next_step: 'Monitor soreness and consult if it persists.' },
  { keyword: 'tender', score: 5, next_step: 'Monitor tenderness and consult if it persists.' },
  { keyword: 'tenderness', score: 5, next_step: 'Monitor tenderness and consult if it persists.' },
  { keyword: 'discomfort', score: 5, next_step: 'Monitor discomfort and consult if it persists.' },
  { keyword: 'uncomfortable', score: 5, next_step: 'Monitor discomfort and consult if it persists.' },
  { keyword: 'tight', score: 5, next_step: 'Monitor tightness and consult if it limits function.' },
  { keyword: 'tightness', score: 5, next_step: 'Monitor tightness and consult if it limits function.' },
  { keyword: 'strain', score: 5, next_step: 'Monitor strain and consult if it persists.' },
  { keyword: 'sprain', score: 5, next_step: 'Monitor sprain and consult if it worsens.' },
  { keyword: 'pulled muscle', score: 5, next_step: 'Monitor pulled muscle and consult if severe.' },
  { keyword: 'muscle strain', score: 5, next_step: 'Monitor muscle strain and consult if it persists.' },
  { keyword: 'cramp', score: 5, next_step: 'Monitor cramps and consult if frequent or severe.' },
  { keyword: 'cramping', score: 5, next_step: 'Monitor cramping and consult if frequent or severe.' },
  { keyword: 'spasm', score: 5, next_step: 'Monitor spasms and consult if frequent or severe.' },
  { keyword: 'muscle spasm', score: 5, next_step: 'Monitor muscle spasms and consult if frequent.' },
  { keyword: 'limited range', score: 5, next_step: 'Monitor range of motion and consult if not improving.' },
  { keyword: 'limited movement', score: 5, next_step: 'Monitor movement and consult if not improving.' },
  { keyword: 'difficulty moving', score: 5, next_step: 'Monitor movement and consult if not improving.' },
  { keyword: "can't move", score: 5, next_step: 'Monitor movement and consult if severe.' },
  { keyword: 'plantar fasciitis', score: 5, next_step: 'Consult a physiotherapist for treatment options.' },
  { keyword: 'tennis elbow', score: 5, next_step: 'Consult a physiotherapist for treatment.' },
  { keyword: "golfer's elbow", score: 5, next_step: 'Consult a physiotherapist for treatment.' },
  { keyword: 'chest congestion', score: 5, next_step: 'Monitor and consult if persistent or worsening.' },
  { keyword: 'stomach pain', score: 5, next_step: 'Monitor stomach pain and consult if persistent.' },
  { keyword: 'belly pain', score: 5, next_step: 'Monitor abdominal pain and consult if persistent.' },
  { keyword: 'bloating', score: 5, next_step: 'Monitor bloating and consult if persistent.' },
  { keyword: 'indigestion', score: 5, next_step: 'Monitor indigestion and consult if frequent.' },
  { keyword: 'heartburn', score: 5, next_step: 'Monitor heartburn and consult if frequent or severe.' },
  { keyword: 'acid reflux', score: 5, next_step: 'Monitor reflux and consult if frequent or severe.' },
  { keyword: 'diarrhea', score: 5, next_step: 'Monitor and consult if persistent or severe.' },
  { keyword: 'constipation', score: 5, next_step: 'Monitor and consult if prolonged.' },
  { keyword: 'insomnia', score: 5, next_step: 'Discuss sleep difficulties with your healthcare provider.' },
  { keyword: "can't sleep", score: 5, next_step: 'Discuss sleep difficulties with your healthcare provider.' },
  { keyword: 'exhausted', score: 5, next_step: 'Monitor exhaustion and consult if persistent.' },
  { keyword: 'tired all the time', score: 5, next_step: 'Consult a healthcare provider about persistent fatigue.' },
  { keyword: 'no energy', score: 5, next_step: 'Monitor energy levels and consult if concerning.' },
  { keyword: 'lethargy', score: 5, next_step: 'Monitor and consult if persistent lethargy.' },
  { keyword: 'anxiety', score: 5, next_step: 'Consider speaking with a mental health professional.' },
  { keyword: 'mood swings', score: 5, next_step: 'Consider discussing mood changes with a healthcare provider.' },
  { keyword: 'irritable', score: 5, next_step: 'Monitor mood changes and consider professional support.' },
  { keyword: 'stressed', score: 5, next_step: 'Consider stress management techniques or professional support.' },
  { keyword: 'redness', score: 5, next_step: 'Monitor skin changes and consult if persistent.' },
  { keyword: 'irritation', score: 5, next_step: 'Monitor skin irritation and consult if worsening.' },
  { keyword: 'itching', score: 5, next_step: 'Monitor itching and consult if severe or persistent.' },
  { keyword: 'itchy', score: 5, next_step: 'Monitor itching and consult if severe or persistent.' },
  { keyword: 'burning skin', score: 5, next_step: 'Monitor skin symptoms and consult if concerning.' },
  { keyword: 'fever', score: 5, next_step: 'Monitor fever and consult if high or persistent.' },
  { keyword: 'chills', score: 5, next_step: 'Monitor and consult if accompanied by other symptoms.' },
  { keyword: 'sweating', score: 5, next_step: 'Monitor sweating patterns and consult if concerning.' },
  { keyword: 'weight gain', score: 5, next_step: 'Monitor weight changes and discuss with healthcare provider.' },
  { keyword: 'appetite loss', score: 5, next_step: 'Monitor appetite changes and consult if persistent.' },
  { keyword: 'loss of appetite', score: 5, next_step: 'Monitor appetite changes and consult if persistent.' },
];

import type { CheckIn } from '../types/database';

const CATEGORY_MAP: Record<string, string[]> = {
  cardiac: [
    'chest pain', 'chest tightness', 'chest pressure', 'chest discomfort', 'chest heaviness',
    'tight chest', 'crushing chest pain', 'irregular heartbeat', 'rapid heartbeat', 'racing heart',
    'palpitations', 'heart pounding', 'heart skipping', 'jaw pain', 'sudden jaw pain',
    'arm numbness', 'numbness in arm', 'cold sweats', 'profuse sweating',
    'shortness of breath', 'difficulty breathing', 'severe shortness of breath', 'heart attack',
  ],
  neurological: [
    'stroke', 'facial drooping', 'slurred speech', 'speech difficulty', 'vision loss',
    'sudden vision loss', 'blurred vision', 'double vision', 'seizure', 'loss of consciousness',
    'unconscious', 'fainting', 'blackout', 'weakness in arm', 'weakness in leg',
    'numbness in arm', 'numbness in leg', 'arm numbness', 'leg numbness', 'paralysis',
    'loss of coordination', 'loss of balance', 'difficulty walking', 'thunderclap headache',
    'worst headache', 'sudden severe headache', 'sudden headache',
  ],
  mental_health_crisis: [
    'suicidal', 'self harm', 'self-harm', 'want to die',
  ],
  spinal_emergency: [
    'cauda equina', 'saddle anaesthesia', 'saddle anesthesia', 'loss of bladder',
    'bladder control', 'loss of bowel', 'bowel control', 'urinary incontinence',
  ],
  respiratory: [
    'cannot breathe', 'difficulty breathing', 'severe shortness of breath', 'shortness of breath',
    'wheezing', 'asthma attack', 'anaphylaxis', 'severe allergic reaction', 'choking',
    "can't catch breath", 'shallow breathing', 'rapid breathing',
  ],
  bleeding: [
    'coughing blood', 'vomiting blood', 'severe bleeding', 'massive bleeding',
    'blood in urine', 'blood in stool',
  ],
};

const keywordToCategories: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [cat, kws] of Object.entries(CATEGORY_MAP)) {
    for (const kw of kws) {
      (out[kw] ||= []).push(cat);
    }
  }
  return out;
})();

const FORCE_EMERGENCY_CATEGORIES = new Set([
  'cardiac', 'neurological', 'spinal_emergency', 'mental_health_crisis', 'respiratory',
]);

const NEGATION_TOKENS = new Set([
  'no', 'not', 'never', 'without', 'denies', 'denied', 'deny',
  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
  "haven't", "hasn't", "hadn't", 'cannot', "cant",
]);

const ATTRIBUTION_TOKENS = new Set([
  'friend', 'friends', "friend's",
  'mother', 'mom', 'mum', "mum's", "mom's",
  'father', 'dad', "dad's",
  'husband', 'wife', 'partner', 'spouse',
  'sister', 'brother', 'sibling',
  'colleague', 'coworker', 'co-worker',
  'neighbor', 'neighbour',
  'son', 'daughter', 'kid', 'child',
  'uncle', 'aunt', 'cousin', 'grandparent', 'grandma', 'grandpa',
]);

const SELF_PRONOUNS = new Set(['i', 'me', 'my', "i've", "i'm", 'ive', 'im', 'mine']);

const SEVERITY_MODIFIERS: Record<string, number> = {
  severe: 1, intense: 1, extreme: 1, terrible: 1, horrible: 1,
  excruciating: 2, unbearable: 2, agonizing: 2, crushing: 2, worst: 2,
};

const ONSET_MODIFIERS: Record<string, number> = {
  sudden: 1, suddenly: 1, 'just now': 1, 'out of nowhere': 2, 'started today': 1,
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const patternCache = new Map<string, RegExp>();
function keywordPattern(keyword: string): RegExp {
  const cached = patternCache.get(keyword);
  if (cached) return cached;
  const body = escapeRegex(keyword).replace(/\s+/g, '\\s+');
  const startBoundary = /^[A-Za-z0-9]/.test(keyword) ? '\\b' : '';
  const endBoundary = /[A-Za-z0-9]$/.test(keyword) ? '\\b' : '';
  const pattern = new RegExp(`${startBoundary}${body}${endBoundary}`, 'gi');
  patternCache.set(keyword, pattern);
  return pattern;
}

function findMatchIndexes(text: string, pattern: RegExp): number[] {
  const p = new RegExp(pattern.source, pattern.flags);
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = p.exec(text)) !== null) {
    out.push(m.index);
    if (p.lastIndex === m.index) p.lastIndex++;
  }
  return out;
}

function tokenizeBefore(text: string, index: number, charsBack = 40): string[] {
  const window = text.substring(Math.max(0, index - charsBack), index).toLowerCase();
  return window.split(/\s+/).map((t) => t.replace(/[^a-z']/g, '')).filter(Boolean);
}

function isMatchDiscarded(text: string, matchIndex: number): boolean {
  const tokens = tokenizeBefore(text, matchIndex, 40);
  const recent = tokens.slice(-4);
  for (const tok of recent) {
    if (NEGATION_TOKENS.has(tok)) return true;
  }
  for (let i = 0; i < recent.length; i++) {
    if (ATTRIBUTION_TOKENS.has(recent[i])) {
      const later = recent.slice(i + 1);
      const hasSelfAfter = later.some((t) => SELF_PRONOUNS.has(t));
      if (!hasSelfAfter) return true;
    }
  }
  return false;
}

function extractNumericPain(text: string): number {
  let max = 0;
  const patterns = [
    /(?:pain|hurt(?:ing)?|severity|ache)[^0-9]{0,20}?(\d{1,2})\s*(?:\/|out\s*of)\s*10/gi,
    /\b(\d{1,2})\s*(?:\/|out\s*of)\s*10\b/gi,
    /\bpain\s+(?:is|at|around|about)\s*(?:an?\s*)?(\d{1,2})\b/gi,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n <= 10 && n > max) max = n;
    }
  }
  return max;
}

function modifierBoost(lower: string): number {
  let boost = 0;
  for (const [mod, b] of Object.entries(SEVERITY_MODIFIERS)) {
    if (new RegExp(`\\b${escapeRegex(mod)}\\b`, 'i').test(lower)) {
      boost = Math.max(boost, b);
    }
  }
  for (const [mod, b] of Object.entries(ONSET_MODIFIERS)) {
    const re = /\s/.test(mod)
      ? new RegExp(escapeRegex(mod), 'i')
      : new RegExp(`\\b${escapeRegex(mod)}\\b`, 'i');
    if (re.test(lower)) boost = Math.max(boost, b);
  }
  return boost;
}

export interface ClientRiskContext {
  avgPainLast3: number;
  painTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  flaggedCountLast7d: number;
  worseChangeRecent: boolean;
  checkInCount: number;
}

export function buildClientRiskContext(checkIns: CheckIn[]): ClientRiskContext {
  if (!checkIns.length) {
    return { avgPainLast3: 0, painTrend: 'unknown', flaggedCountLast7d: 0, worseChangeRecent: false, checkInCount: 0 };
  }
  const sorted = [...checkIns].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const last3 = sorted.slice(0, 3);
  const avgPainLast3 = last3.reduce((s, c) => s + (c.pain_level || 0), 0) / last3.length;

  let painTrend: ClientRiskContext['painTrend'] = 'unknown';
  if (last3.length >= 2) {
    const newest = last3[0].pain_level;
    const oldest = last3[last3.length - 1].pain_level;
    if (newest > oldest + 1) painTrend = 'rising';
    else if (newest < oldest - 1) painTrend = 'falling';
    else painTrend = 'stable';
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sorted.filter((c) => new Date(c.created_at).getTime() >= sevenDaysAgo);
  const flaggedCountLast7d = recent.filter((c) => c.flagged).length;
  const worseChangeRecent = recent.slice(0, 3).some((c) => c.symptom_change === 'worse');

  return { avgPainLast3, painTrend, flaggedCountLast7d, worseChangeRecent, checkInCount: sorted.length };
}

function contextBoost(ctx?: ClientRiskContext): number {
  if (!ctx) return 0;
  let boost = 0;
  if (ctx.avgPainLast3 >= 7) boost += 1;
  if (ctx.painTrend === 'rising') boost += 1;
  if (ctx.flaggedCountLast7d >= 3) boost += 1;
  if (ctx.worseChangeRecent) boost += 1;
  return Math.min(boost, 2);
}

export interface RealTimeAnalysisResult {
  detected: boolean;
  severity: number;
  baseSeverity: number;
  matchedKeywords: string[];
  matchedCategories: string[];
  clusterBonus: number;
  modifierBonus: number;
  contextBonus: number;
  numericPainRating: number;
  needsProfessionalAlert: boolean;
  urgency: 'emergency' | 'urgent' | 'soon' | 'monitor' | 'routine';
}

function scoreText(text: string, context?: ClientRiskContext): RealTimeAnalysisResult {
  if (!text.trim()) {
    return {
      detected: false, severity: 0, baseSeverity: 0, matchedKeywords: [],
      matchedCategories: [], clusterBonus: 0, modifierBonus: 0, contextBonus: 0,
      numericPainRating: 0, needsProfessionalAlert: false, urgency: 'routine',
    };
  }

  const lower = text.toLowerCase();
  let baseSeverity = 0;
  const matched: string[] = [];
  const categoryHits: Record<string, number> = {};

  for (const item of RED_FLAG_KEYWORDS) {
    const pattern = keywordPattern(item.keyword);
    const indexes = findMatchIndexes(lower, pattern);
    if (indexes.length === 0) continue;
    const validHit = indexes.some((idx) => !isMatchDiscarded(lower, idx));
    if (!validHit) continue;
    if (!matched.includes(item.keyword)) matched.push(item.keyword);
    if (item.score > baseSeverity) baseSeverity = item.score;
    const cats = keywordToCategories[item.keyword];
    if (cats) {
      for (const c of cats) categoryHits[c] = (categoryHits[c] || 0) + 1;
    }
  }

  let clusterBonus = 0;
  const matchedCategories: string[] = [];
  for (const [cat, count] of Object.entries(categoryHits)) {
    if (count >= 2) {
      matchedCategories.push(cat);
      clusterBonus = Math.max(clusterBonus, count >= 3 ? 3 : 2);
    }
  }

  const numericPainRating = extractNumericPain(lower);
  const modifierBonus = modifierBoost(lower);
  const contextBonus = contextBoost(context);

  const baseWithPain = Math.max(baseSeverity, numericPainRating);
  let severity = Math.min(10, baseWithPain + clusterBonus + modifierBonus + contextBonus);

  if (matchedCategories.some((c) => FORCE_EMERGENCY_CATEGORIES.has(c))) {
    severity = Math.max(severity, 9);
  }
  if (baseSeverity >= 10) severity = 10;

  const urgency: RealTimeAnalysisResult['urgency'] =
    severity >= 9
      ? 'emergency'
      : severity >= 7
      ? 'urgent'
      : severity >= 5
      ? context && (context.painTrend === 'rising' || context.flaggedCountLast7d >= 2 || context.worseChangeRecent)
        ? 'soon'
        : 'monitor'
      : baseSeverity > 0 || numericPainRating > 0
      ? 'monitor'
      : 'routine';

  const detected = matched.length > 0 || numericPainRating >= 7;
  const needsProfessionalAlert = severity >= 7 || urgency === 'soon';

  return {
    detected, severity, baseSeverity, matchedKeywords: matched, matchedCategories,
    clusterBonus, modifierBonus, contextBonus, numericPainRating, needsProfessionalAlert, urgency,
  };
}

export function analyzeSymptomRealTime(
  text: string,
  context?: ClientRiskContext,
): RealTimeAnalysisResult {
  return scoreText(text, context);
}

interface AnalysisResult {
  red_flag_detected: boolean;
  confidence_score: number;
  matched_symptom: string | null;
  matched_score: number | null;
  suggested_next_step: string;
  severity?: number;
  urgency?: RealTimeAnalysisResult['urgency'];
  matched_categories?: string[];
  numeric_pain_rating?: number;
  context_bonus?: number;
  cluster_bonus?: number;
  modifier_bonus?: number;
}

export function analyzeSymptomLocal(
  description: string,
  context?: ClientRiskContext,
): AnalysisResult {
  const rt = scoreText(description, context);

  let matchedKeyword: string | null = null;
  let matchedNextStep = '';
  let bestScore = -1;
  for (const item of RED_FLAG_KEYWORDS) {
    if (rt.matchedKeywords.includes(item.keyword) && item.score > bestScore) {
      bestScore = item.score;
      matchedKeyword = item.keyword;
      matchedNextStep = item.next_step;
    }
  }

  const redFlag = rt.severity >= 6 || rt.urgency === 'urgent' || rt.urgency === 'emergency';

  const defaultNextStep = redFlag
    ? 'Please contact your practitioner for review.'
    : 'Continue your current treatment plan and monitor your symptoms. Book a follow-up if symptoms persist or worsen.';

  return {
    red_flag_detected: redFlag,
    confidence_score: rt.severity / 10,
    matched_symptom: matchedKeyword,
    matched_score: matchedKeyword ? rt.severity : null,
    suggested_next_step: matchedNextStep || defaultNextStep,
    severity: rt.severity,
    urgency: rt.urgency,
    matched_categories: rt.matchedCategories,
    numeric_pain_rating: rt.numericPainRating,
    context_bonus: rt.contextBonus,
    cluster_bonus: rt.clusterBonus,
    modifier_bonus: rt.modifierBonus,
  };
}
