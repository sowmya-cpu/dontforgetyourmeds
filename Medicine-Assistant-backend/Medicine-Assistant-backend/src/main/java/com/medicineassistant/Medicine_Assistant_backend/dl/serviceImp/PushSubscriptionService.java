package com.medicineassistant.Medicine_Assistant_backend.dl.serviceImp;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.medicineassistant.Medicine_Assistant_backend.model.PushSubscriptionEntity;
import com.medicineassistant.Medicine_Assistant_backend.repository.PushSubscriptionRepository;
@Service
public class PushSubscriptionService {
	@Autowired
	PushSubscriptionRepository repository;
	
	 @Transactional
	    public void saveSubscription(
	            String endpoint,
	            String p256dh,
	            String auth,
	            Long userId) {

	        var existing = repository.findByEndpoint(endpoint);

	        PushSubscriptionEntity subscription;

	        if (existing.isPresent()) {
	            subscription = existing.get();
	            subscription.setP256dh(p256dh);
	            subscription.setAuth(auth);
	            subscription.setUserId(userId);
	        } else {
	            subscription = new PushSubscriptionEntity(
	                    endpoint, p256dh, auth, userId);
	        }

	        repository.save(subscription);
	    }
	 
	 public java.util.List<PushSubscriptionEntity> getSubscriptionsForUser(
		        Long userId) {
		    return repository.findByUserId(userId);
		}
}
