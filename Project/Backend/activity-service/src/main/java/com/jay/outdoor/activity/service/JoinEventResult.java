package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.entity.EventRegistration;

public record JoinEventResult(EventRegistration registration, boolean created) {

}
