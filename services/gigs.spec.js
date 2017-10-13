import expect from 'expect';
import { getAll, search, askForAvailability, stopAsking } from './gigs';

import Gig from '../schemas/gig.js';
import Settings from '../schemas/settings.js';

describe('services/gigs', () => {
  let stoppableGig;
  before(async () => {
    stoppableGig = await new Gig({
      request: {
        active: true,
      },
    }).save();
  });
  describe('stopAsking', function() {
    it('should stop a gigs request', function() {
      stopAsking(stoppableGig._id, async (err) => {
        const gig = await Gig.findById(stoppableGig._id);
        expect(gig.request.active).toBe(false);
      });
    });
  });
});
