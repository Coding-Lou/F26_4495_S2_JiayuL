package com.jay.outdoor.activity.service;

import java.util.UUID;

public class RegistrationPendingException extends RuntimeException {
  public RegistrationPendingException(UUID eventId) {
    super("Registration is not yet confirmed for event " + eventId);
  }
}